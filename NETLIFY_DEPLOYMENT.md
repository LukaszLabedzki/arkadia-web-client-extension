# Netlify Deployment Guide for Arkadia Plugins

This guide explains how to deploy your example plugins to Netlify so they're publicly accessible.

## Prerequisites

- Netlify account (free tier works fine)
- Netlify CLI installed globally (optional but recommended)

```bash
npm install -g netlify-cli
```

## Configuration Files

The following files are already configured for deployment:

1. **`netlify.toml`** - Netlify build configuration
2. **`examples/dist/index.html`** - Static landing page listing all plugins

## Deployment Methods

### Method 1: Using Netlify CLI (Recommended)

#### First Time Setup

1. **Login to Netlify:**
   ```bash
   netlify login
   ```

2. **Initialize the site (from project root):**
   ```bash
   netlify init
   ```

   Follow the prompts:
   - Create & configure a new site
   - Choose your team
   - Give it a site name (e.g., `arkadia-plugins`)
   - Build command: `yarn build:examples` (already in netlify.toml)
   - Deploy directory: `examples/dist` (already in netlify.toml)

#### Deploy

```bash
# Build and deploy in one command
netlify deploy --prod

# Or deploy without building (if already built)
netlify deploy --prod --dir=examples/dist
```

Your plugins will be available at: `https://your-site-name.netlify.app/`

### Method 2: Via Netlify Web UI

#### Option A: Drag & Drop

1. Build the plugins locally:
   ```bash
   yarn build:examples
   ```

2. Go to [Netlify Drop](https://app.netlify.com/drop)

3. Drag and drop the `examples/dist` folder

4. Done! Netlify will provide a URL like `https://random-name-123456.netlify.app/`

#### Option B: Git Integration (Continuous Deployment)

1. Push your code to GitHub/GitLab/Bitbucket

2. Go to [Netlify Dashboard](https://app.netlify.com/)

3. Click "Add new site" → "Import an existing project"

4. Connect your Git provider and select your repository

5. Configure build settings:
   - **Branch to deploy:** `master` (or your main branch)
   - **Build command:** `yarn build:examples`
   - **Publish directory:** `examples/dist`
   - *(These are already in netlify.toml, so Netlify should detect them)*

6. Click "Deploy site"

7. Netlify will automatically deploy on every push!

## Using Your Deployed Plugins

Once deployed, your plugins will be available at URLs like:

```
https://your-site-name.netlify.app/simple-highlighter-plugin.js
https://your-site-name.netlify.app/example-plugin.js
https://your-site-name.netlify.app/combat-alert-plugin.js
https://your-site-name.netlify.app/jadalnia-plugin.js
```

### In Arkadia Web Client:

1. Open the client
2. Click "Skrypty" (Scripts) in menu
3. Add plugin URL: `https://your-site-name.netlify.app/jadalnia-plugin.js`
4. Click "Dodaj" (Add)
5. Plugin loads automatically!

## Custom Domain (Optional)

To use your own domain:

1. Go to your site in Netlify Dashboard
2. Click "Domain settings"
3. Click "Add custom domain"
4. Follow the instructions to set up DNS

Then your plugins will be at:
```
https://plugins.yourdomain.com/jadalnia-plugin.js
```

## Environment Variables

If your plugins need environment variables:

1. Go to Site settings → Build & deploy → Environment
2. Add your variables
3. They'll be available during build time

## Netlify Configuration Details

The `netlify.toml` file includes:

```toml
[build]
  command = "yarn build:examples"
  publish = "examples/dist"

# CORS headers for plugins
[[headers]]
  for = "/*.js"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Content-Type = "application/javascript; charset=utf-8"
```

### Key Features:

- **CORS enabled** - Plugins can be loaded from any domain
- **Proper Content-Type** - JavaScript files served with correct MIME type
- **Automatic builds** - Compiles TypeScript to JavaScript
- **Static hosting** - Fast CDN delivery worldwide

## Build Process

When you deploy, Netlify will:

1. Install dependencies with `yarn`
2. Run `yarn build:examples` which:
   - Compiles all `*-plugin.ts` files in `examples/`
   - Outputs compiled `.js` files to `examples/dist/`
3. Deploy the `examples/dist/` directory
4. Serve files with proper headers

## Testing Before Deploy

Always test locally first:

```bash
# Build
yarn build:examples

# Test with local server
yarn serve:examples

# Open http://localhost:3030
```

## Updating Plugins

### With Git Integration (Automatic):
1. Make changes to plugin files
2. Commit and push to Git
3. Netlify automatically rebuilds and redeploys

### With CLI (Manual):
```bash
# Make changes
# Build
yarn build:examples

# Deploy
netlify deploy --prod
```

### With Web UI (Manual):
1. Build locally: `yarn build:examples`
2. Drag & drop `examples/dist` to Netlify

## Monitoring

View deployment logs in Netlify Dashboard:
- Build logs
- Deploy logs
- Function logs (if using)
- Analytics (on paid plans)

## Rollback

If something goes wrong:

1. Go to Deploys in Netlify Dashboard
2. Find a previous working deploy
3. Click "Publish deploy"
4. Instant rollback!

## Best Practices

1. **Test locally first** - Always use `yarn serve:examples` before deploying
2. **Use Git integration** - Automatic deploys on push
3. **Version your plugins** - Update version in PluginInfo
4. **Keep builds small** - Don't bundle unnecessary dependencies
5. **Monitor usage** - Check Netlify analytics
6. **Use branch deploys** - Test changes in preview deployments

## Troubleshooting

### Plugin doesn't load
- Check CORS headers are set (they are in netlify.toml)
- Verify URL is correct (ends with `.js`)
- Check browser console for errors

### Build fails
- Check Node version compatibility
- Verify all dependencies in package.json
- Check build logs in Netlify Dashboard

### URL not working
- Ensure site is published (not just draft)
- Check DNS if using custom domain
- Verify file exists in deployed directory

## Cost

Netlify free tier includes:
- 100GB bandwidth/month
- 300 build minutes/month
- Automatic SSL
- CDN hosting

Perfect for hosting plugins! Upgrade only if you need more bandwidth.

## Example Deploy Commands

```bash
# One-time setup
netlify login
netlify init

# Regular deployment
yarn build:examples
netlify deploy --prod

# Quick deploy (build + deploy)
yarn build:examples && netlify deploy --prod

# Preview deploy (test URL)
netlify deploy

# Deploy specific directory
netlify deploy --prod --dir=examples/dist

# Open deployed site
netlify open:site
```

## Support

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify CLI Documentation](https://cli.netlify.com/)
- [Netlify Community](https://answers.netlify.com/)

## Summary

1. **Quick deploy**: `yarn build:examples && netlify deploy --prod`
2. **Get URL**: Check Netlify Dashboard or CLI output
3. **Use in client**: Add plugin URL in Scripts section
4. **Update**: Push to Git (auto-deploy) or run deploy command again

Your plugins are now publicly available and can be shared with other Arkadia players!
