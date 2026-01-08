import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { generateToken, validateEmailDomain, generateOTP } from '../utils/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config.js';
import { SignupRequestSchema, VerifyOTPSchema } from '../schemas/index.js';
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);



const router = Router();

// In-memory OTP store (in production, use Redis or database)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

/**
 * POST /auth/signup
 * Request email and send OTP
 */
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const { email } = SignupRequestSchema.parse(req.body);

  const isMarisaDomain = validateEmailDomain(email);

  // Check if user exists in database
  let user = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  // Rule 1: If NOT from marisa.care domain AND NOT in database → BLOCK
  if (!isMarisaDomain && !user.data) {
    res.status(403).json({
      error: 'Access denied',
      message: `Only users from ${config.auth.allowedEmailDomain} domain or invited users can access this platform.`,
    });
    return;
  }

  // Rule 2: If NOT from marisa.care BUT exists in database (invited) → USE DATABASE ROLE
  if (!isMarisaDomain && user.data) {
    // User was invited, check if status allows access
    if (user.data.status === 'blocked') {
      const reasonMessage = user.data.blocked_reason 
        ? `Motivo: ${user.data.blocked_reason}` 
        : 'Entre em contato com um administrador.';
      
      res.status(403).json({
        error: 'Conta bloqueada',
        message: `Sua conta foi bloqueada. ${reasonMessage}`,
        blocked_at: user.data.blocked_at,
        blocked_reason: user.data.blocked_reason
      });
      return;
    }

    // Update status from pending_invite to active
    if (user.data.status === 'pending_invite') {
      await db
        .from('users')
        .update({ status: 'active' })
        .eq('id', user.data.id);
      
      user.data.status = 'active';
    }

    // Continue with existing user (keep their assigned role)
  }

  // Rule 3: If from marisa.care domain → AUTO-CREATE as TESTER
  if (isMarisaDomain && !user.data) {
    // Create new user with tester role
    const { data: newUser, error } = await db
      .from('users')
      .insert({
        email,
        role: 'tester',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }
    user.data = newUser;
  }

  // Generate and store OTP (valid for 10 minutes)
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  otpStore[email] = { code: otp, expiresAt };

  // TODO: Send OTP via email using Sendgrid/AWS SES
   await resend.emails.send({
     from: process.env.EMAIL_FROM || "noreply@marisa.care",
     to: email,
     subject: "Seu código de acesso - AI Marisa Playground",
     html: `
       <h2>Código de Acesso</h2>
       <p>Seu código OTP é:</p>
       <h1 style="font-size: 32px; letter-spacing: 5px;">${otp}</h1>
       <p>Este código expira em 10 minutos.</p>
     `,
   });

   // Manter console.log apenas em development
   if (config.server.nodeEnv === "development") {
     console.log(`OTP for ${email}: ${otp}`);
   }

  res.json({
    message: 'OTP sent to email',
    email,
    // In development, return OTP for testing (remove in production)
    ...(config.server.nodeEnv === 'development' && { otp }),
  });
}));

/**
 * POST /auth/verify
 * Verify OTP and return JWT token
 */
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = VerifyOTPSchema.parse(req.body);

  // Check OTP
  const otpData = otpStore[email];
  if (!otpData || otpData.code !== code || otpData.expiresAt < Date.now()) {
    res.status(401).json({ error: 'Invalid or expired OTP' });
    return;
  }

  // Remove OTP
  delete otpStore[email];

  // Get user
  const { data: user, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Update last login
  await db
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  // Generate token
  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
  });
}));

/**
 * POST /auth/logout
 * Logout (token blacklist can be implemented if needed)
 */
router.post('/logout', (req: Request, res: Response) => {
  // Tokens are stateless, so logout is handled on frontend
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /auth/register-qa
 * Public route for QA registration (no authentication required)
 */
router.post('/register-qa', asyncHandler(async (req: Request, res: Response) => {
  const {
    primary_language,
    full_name,
    email,
    birth_date,
    gender,
    nationality,
    phone,
    secondary_languages,
    document_number,
    document_photo,
    geolocation,
    selfie_photo,
    education,
    terms_accepted
  } = req.body;

  // Validate required fields
  if (!email || !full_name || !primary_language || !terms_accepted) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Check if email already exists
  const { data: existingUser } = await db
    .from('users')
    .select('id, status')
    .eq('email', email)
    .single();

  if (existingUser) {
    res.status(400).json({ 
      error: 'Email already registered',
      status: existingUser.status 
    });
    return;
  }

  // Validate file sizes before processing (2MB max)
  const validateBase64Size = (base64Data: string, fieldName: string) => {
    if (!base64Data) return;
    const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const sizeInBytes = (base64String.length * 3) / 4;
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
    if (sizeInBytes > maxSizeInBytes) {
      throw new Error(`${fieldName} exceeds 2MB limit`);
    }
  };

  try {
    validateBase64Size(document_photo, 'Document photo');
    validateBase64Size(selfie_photo, 'Selfie photo');
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }

  // Validate age (must be 18+)
  const birthDate = new Date(birth_date);
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) {
    res.status(400).json({ error: 'You must be at least 18 years old' });
    return;
  }

  // Capture IP address from request
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Import storage helpers
    const { uploadQADocument, uploadQASelfie } = await import('../utils/storage.js');
    const { sendQARegistrationPendingEmail } = await import('../utils/email.js');

    // Create user first (we need the ID for uploads)
    const { data: newUser, error: createError } = await db
      .from('users')
      .insert({
        email,
        full_name,
        role: 'qa',
        status: 'pending_approval',
        primary_language,
        nationality,
        phone,
        birth_date,
        gender,
        secondary_languages: secondary_languages || [],
        document_number,
        geolocation,
        ip_address: ip_address as string,
        education,
        terms_accepted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !newUser) {
      console.error('Error creating QA user:', createError);
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }

    // Upload document photo
    let documentUrl = null;
    if (document_photo) {
      try {
        documentUrl = await uploadQADocument(document_photo, newUser.id);
      } catch (uploadError) {
        console.error('Error uploading document:', uploadError);
        // Continue even if upload fails
      }
    }

    // Upload selfie
    let selfieUrl = null;
    if (selfie_photo) {
      try {
        selfieUrl = await uploadQASelfie(selfie_photo, newUser.id);
      } catch (uploadError) {
        console.error('Error uploading selfie:', uploadError);
        // Continue even if upload fails
      }
    }

    // Update user with photo URLs
    if (documentUrl || selfieUrl) {
      await db
        .from('users')
        .update({
          document_photo_url: documentUrl,
          selfie_photo_url: selfieUrl,
        })
        .eq('id', newUser.id);
    }

    // Send pending email
    try {
      await sendQARegistrationPendingEmail({
        to: email,
        fullName: full_name,
        language: primary_language as 'pt' | 'en' | 'es',
      });
    } catch (emailError) {
      console.error('Error sending QA pending email:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'Registration submitted successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        status: 'pending_approval'
      },
      redirect: '/register-qa/pending'
    });

  } catch (error) {
    console.error('Error in QA registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}));

/**
 * GET /auth/my-photos
 * Get own QA photos with signed URLs (authenticated users only)
 */
router.get('/my-photos', asyncHandler(async (req: Request, res: Response) => {
  // Get user from token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { verifyToken } = await import('../utils/auth.js');
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Fetch user photos
  const { data: user, error } = await db
    .from('users')
    .select('document_photo_url, selfie_photo_url')
    .eq('id', decoded.sub)
    .single();

  if (error || !user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Generate signed URLs
  const { getSignedUrl } = await import('../utils/storage.js');
  
  let documentSignedUrl = null;
  let selfieSignedUrl = null;

  if (user.document_photo_url) {
    try {
      documentSignedUrl = await getSignedUrl('qa-documents', user.document_photo_url);
    } catch (error) {
      console.error('Error generating document signed URL:', error);
    }
  }

  if (user.selfie_photo_url) {
    try {
      selfieSignedUrl = await getSignedUrl('qa-selfies', user.selfie_photo_url);
    } catch (error) {
      console.error('Error generating selfie signed URL:', error);
    }
  }

  res.json({
    data: {
      document_photo_url: documentSignedUrl,
      selfie_photo_url: selfieSignedUrl
    }
  });
}));

export default router;
