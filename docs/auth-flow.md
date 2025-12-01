# Authentication Flow

## Overview

The system uses email-based OTP (One-Time Password) authentication with domain validation. All users must have an @marisa.care email address.

## Flow Diagram

```
User
  │
  ├─> Email Input
  │       │
  │       └─> Validate domain (@marisa.care)
  │
  ├─> Backend: /auth/signup
  │       │
  │       ├─> Check if user exists in DB
  │       │   ├─> If exists: skip
  │       │   └─> If not: create with role='tester'
  │       │
  │       ├─> Generate 6-digit OTP
  │       │
  │       ├─> Store OTP (10 min expiry)
  │       │
  │       └─> Send via email (TODO: integrate Sendgrid)
  │
  ├─> Frontend: Display OTP input
  │       │
  │       └─> OTP sent to email (dev mode shows it)
  │
  ├─> Backend: /auth/verify
  │       │
  │       ├─> Validate OTP format & expiry
  │       │
  │       ├─> Fetch user from DB
  │       │
  │       ├─> Generate JWT token (7 day expiry)
  │       │
  │       └─> Update last_login
  │
  └─> Frontend: Store token + user in localStorage
           │
           └─> Redirect based on role (admin/tester)
```

## Implementation Details

### Email Validation

```typescript
// Backend: Only @marisa.care emails allowed
validateEmailDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return domain === 'marisa.care';
}
```

### OTP Generation & Storage

```typescript
// Generate 6-digit code
generateOTP(): string {
  return Math.random().toString().slice(2, 8);
}

// In-memory store (production: use Redis)
const otpStore = {
  'user@marisa.care': {
    code: '123456',
    expiresAt: Date.now() + 10 * 60 * 1000
  }
}
```

### JWT Token Structure

```typescript
interface AuthToken {
  sub: string; // user ID
  email: string; // user email
  role: "admin" | "tester";
  iat: number; // issued at
  exp: number; // expires in
}
```

### Token Usage

Every authenticated request includes:

```
Authorization: Bearer <JWT_TOKEN>
```

Middleware extracts and verifies token:

```typescript
const token = authHeader.slice(7); // Remove "Bearer "
const decoded = verifyToken(token);
req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
```

## Security Considerations

1. **OTP Expiry**: 10 minutes to limit brute force attempts
2. **Domain Whitelist**: Only @marisa.care emails accepted
3. **JWT Secret**: Must be stored in environment variable
4. **HTTPS**: Required in production for token transmission
5. **CORS**: Configured to specific domains only

## User Roles & Access

### Admin

- Can create/edit/delete playgrounds
- Can view all metrics
- Can manage playgrounds
- Direct access to `/admin/*` routes

### Tester

- Can view available playgrounds
- Can submit evaluations
- Can see own evaluation history
- Access to `/playground/*` and `/dashboard`

## First Login vs Returning User

### New User

1. Email doesn't exist in DB
2. System creates user with role='tester'
3. User can evaluate playgrounds immediately

### Returning User

1. Email exists in DB
2. User logs in with existing role (admin/tester)
3. `last_login` timestamp updated

### Admin Promotion

- Currently done via database update
- TODO: Implement admin invitation flow

## Development vs Production

### Development

- OTP returned in response for testing
- OTP stored in-memory (not persisted)
- No email sending (logs to console)
- JWT_SECRET can be simple

### Production

- OTP NOT returned (email only)
- OTP stored in Redis with TTL
- Email sent via SendGrid/AWS SES
- Strong JWT_SECRET required
- HTTPS enforced

## Frontend Integration

```typescript
// Login page flow
const [email, setEmail] = useState("");
const [otp, setOtp] = useState("");
const [step, setStep] = useState<"email" | "otp">("email");

// Step 1: Send email
const handleSendOTP = async () => {
  const response = await api.post("/auth/signup", { email });
  if (response.data.otp) {
    // Dev: show OTP
    console.log("OTP:", response.data.otp);
  }
  setStep("otp");
};

// Step 2: Verify OTP
const handleVerifyOTP = async () => {
  const response = await api.post("/auth/verify", { email, code: otp });
  const { token, user } = response.data;

  // Store in localStorage
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  // Redirect
  router.push(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
};
```

## API Endpoints

- `POST /auth/signup` - Request OTP
- `POST /auth/verify` - Verify OTP and get token
- `POST /auth/logout` - Logout (frontend clears storage)
