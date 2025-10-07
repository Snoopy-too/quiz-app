# Supabase Email Verification Setup

## Overview
QuizMaster uses Supabase's built-in email verification system. When users register, they receive a confirmation email with a verification link. Clicking the link confirms their email and activates their account.

## Database Migration

### 1. Remove old verification_code column (if it exists)

Run this SQL in Supabase SQL Editor:

```sql
-- Execute: remove-verification-code-column.sql
DROP INDEX IF EXISTS idx_users_verification_code;
ALTER TABLE users DROP COLUMN IF EXISTS verification_code;
```

## Supabase Email Settings Configuration

### 2. Configure Email Templates

1. **Go to Supabase Dashboard**
   - Navigate to: **Authentication → Email Templates**
   - Select **"Confirm signup"** template

2. **Customize the Email Template** (optional)

   Default template is fine, but you can customize it:

   ```html
   <h2>Welcome to QuizMaster!</h2>

   <p>Thanks for signing up! Please confirm your email address by clicking the button below:</p>

   <p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirm your email</a></p>

   <p>Or copy and paste this URL into your browser:</p>
   <p>{{ .ConfirmationURL }}</p>

   <p>This link will expire in 24 hours.</p>

   <p>If you didn't create an account with QuizMaster, you can safely ignore this email.</p>
   ```

### 3. Set Redirect URL

1. **In Supabase Dashboard**
   - Navigate to: **Authentication → URL Configuration**
   - Set **Site URL** to your app URL:
     - Development: `http://localhost:5173`
     - Production: `https://your-app.netlify.app` (or your domain)

2. **Add Redirect URLs**
   - In **Redirect URLs**, add:
     - `http://localhost:5173/**`
     - `https://your-app.netlify.app/**`
   - This allows Supabase to redirect users back after email confirmation

### 4. Email Confirmation Settings

1. **In Supabase Dashboard**
   - Navigate to: **Authentication → Settings**
   - Under **Email Auth**:
     - ✅ **Enable email confirmations** (must be ON)
     - ✅ **Secure email change** (recommended)
   - **Email confirmation expiry**: 86400 seconds (24 hours) - default is fine

## How the Verification Flow Works

1. **User Registers** (`Register.jsx`)
   - User fills out registration form
   - Supabase creates auth account with `signUp()`
   - App creates profile in `users` table with `verified: false`
   - Supabase automatically sends confirmation email

2. **User Checks Email**
   - User is redirected to "Check Your Email" page (`VerifyEmail.jsx`)
   - User can resend verification email if needed

3. **User Clicks Link**
   - User clicks confirmation link in email
   - Supabase confirms the email address
   - User is redirected back to app

4. **App Syncs Verification** (`App.jsx:260-277`)
   - Auth state change event fires
   - App detects `email_confirmed_at` is set
   - App updates `users.verified = true` in database
   - User can now login and access app

## Testing the Flow

### Local Testing

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Test registration**
   - Go to http://localhost:5173
   - Click "Register"
   - Fill out form and submit

3. **Check Supabase logs**
   - Go to Supabase Dashboard → Authentication → Users
   - You should see the new user with "Unconfirmed" status

4. **Get confirmation link**

   **Option A: Check email**
   - If you configured SMTP, check your email inbox

   **Option B: Check Supabase logs** (for testing)
   - Go to Supabase Dashboard → Authentication → Logs
   - Find the email log entry
   - Copy the confirmation URL from the log

5. **Confirm email**
   - Click the link (or paste in browser)
   - You should be redirected back to app
   - Check Supabase Dashboard - user should now show as "Confirmed"

## Troubleshooting

### Issue: "Enable email confirmations" is grayed out

**Solution:** This is a Supabase project setting. If it's disabled, you may need to:
1. Check if you're on the correct Supabase plan
2. Contact Supabase support to enable it

### Issue: Emails not being sent

**Possible causes:**

1. **No SMTP configured** (common in development)
   - By default, Supabase uses their own email service (limited sends)
   - For production, configure custom SMTP:
     - Go to: **Authentication → Settings → SMTP Settings**
     - Configure with SendGrid, Mailgun, AWS SES, etc.

2. **Rate limiting**
   - Supabase limits emails on free tier
   - Check Supabase Dashboard → Authentication → Logs

3. **Check spam folder**
   - Confirmation emails might be filtered

### Issue: User verified in Supabase but not in app

**Solution:** The sync happens in `App.jsx:260-277`. Check:
1. Browser console for sync errors
2. RLS policies allow updating `users.verified`
3. User has a profile in `users` table

### Issue: Redirect after confirmation goes to wrong URL

**Solution:**
1. Check **Site URL** in Supabase settings
2. Verify **Redirect URLs** include your app URL
3. Make sure you're using the correct environment (dev vs prod)

## Security Notes

- ✅ Email links expire after 24 hours
- ✅ Links can only be used once
- ✅ Supabase validates the token server-side
- ✅ No manual code entry = more secure
- ✅ Users cannot bypass verification

## Production Checklist

Before deploying to production:

- [ ] Configure custom SMTP provider (SendGrid, Mailgun, etc.)
- [ ] Update Site URL to production domain
- [ ] Add production domain to Redirect URLs
- [ ] Customize email template with your branding
- [ ] Test full registration → verification → login flow
- [ ] Monitor email delivery in Supabase logs
- [ ] Set up email alerts for bounced emails

## Related Files

- `src/components/auth/Register.jsx` - Registration with Supabase signUp
- `src/components/auth/VerifyEmail.jsx` - "Check your email" page with resend
- `src/App.jsx:260-277` - Syncs verification status to database
- `remove-verification-code-column.sql` - Cleanup old verification system
