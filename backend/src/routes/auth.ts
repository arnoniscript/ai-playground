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

  // Validate email domain
  if (!validateEmailDomain(email)) {
    res.status(400).json({
      error: `Email must be from domain ${config.auth.allowedEmailDomain}`,
    });
    return;
  }

  // Check if user exists or create
  let user = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user.data) {
    // Create new user
    const { data: newUser, error } = await db
      .from('users')
      .insert({
        email,
        role: 'tester', // Default role
      })
      .select()
      .single();

    if (error) throw error;
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

export default router;
