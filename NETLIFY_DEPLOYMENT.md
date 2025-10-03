# Netlify Deployment Guide for QuizMaster App

## The Problem: Blank White Screen

Your app was showing a blank screen on Netlify due to:

1. **Missing environment variables** - Supabase credentials not configured in Netlify
2. **No SPA routing configuration** - Caused 404 errors on page refresh
3. **Build configuration issues**

## Solutions Applied

### 1. Created `netlify.toml`
This file configures Netlify's build settings and SPA routing.

### 2. Created `public/_redirects`
Backup redirect rule for SPA routing (all routes go to index.html).

### 3. Updated `vite.config.js`
Optimized build configuration with code splitting for better performance.

### 4. Created `.env.example`
Template for environment variables needed.

## Steps to Fix Your Netlify Deployment

### Step 1: Set Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Site settings** > **Environment variables**
4. Add these variables:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon/public key

**Where to find these values:**
- Login to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to **Settings** > **API**
- Copy the **Project URL** and **anon/public** key

### Step 2: Push the New Configuration Files

```bash
git add netlify.toml public/_redirects vite.config.js .env.example NETLIFY_DEPLOYMENT.md
git commit -m "Add Netlify deployment configuration"
git push origin main
```

### Step 3: Redeploy on Netlify

Option A: **Automatic deployment** (if auto-deploy is enabled)
- Netlify will automatically deploy when you push to main

Option B: **Manual deployment**
1. Go to Netlify dashboard
2. Click **Deploys**
3. Click **Trigger deploy** > **Deploy site**

### Step 4: Verify Deployment

After deployment completes:
1. Open your Netlify URL
2. Open browser developer console (F12)
3. Check for:
   - ✅ No console errors
   - ✅ App loads correctly
   - ✅ Can navigate between pages without 404 errors

## Common Issues & Solutions

### Issue: Still seeing blank screen
**Solution:** Check browser console for errors. Most likely missing environment variables.

### Issue: 404 on page refresh
**Solution:** Verify `_redirects` file is in the `public` folder and `netlify.toml` has redirect rules.

### Issue: Supabase connection errors
**Solution:**
1. Verify environment variables are set correctly in Netlify (no typos)
2. Ensure variables start with `VITE_` prefix
3. Redeploy after adding/updating env vars

### Issue: Build fails
**Solution:**
- Check Netlify build logs for specific errors
- Ensure all dependencies are in `package.json`
- Try running `npm run build` locally first

## Testing Before Deployment

Run these commands locally to test:

```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

This will simulate the production environment and help catch issues before deployment.

## Build Settings in Netlify UI

If using Netlify UI instead of `netlify.toml`:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18 (or latest LTS)

## Additional Resources

- [Netlify Docs - Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Vite Docs - Deploying to Netlify](https://vitejs.dev/guide/static-deploy.html#netlify)
- [Supabase Docs - Environment Variables](https://supabase.com/docs/guides/getting-started/tutorials/with-react#get-the-api-keys)
