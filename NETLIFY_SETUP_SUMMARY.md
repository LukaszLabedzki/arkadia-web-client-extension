# Netlify Deployment Setup - Complete ✅

Your Arkadia plugins are now ready to deploy to Netlify! Here's what was set up:

## Files Created

### Configuration Files
1. **`netlify.toml`** - Netlify build configuration
   - Build command: `yarn build:examples`
   - Publish directory: `examples/dist`
   - CORS headers enabled for all `.js` files
   - Proper Content-Type headers

2. **`examples/dist/index.html`** - Beautiful landing page
   - Lists all available plugins
   - Copy-to-clipboard functionality
   - Responsive design
   - Automatically shows the correct URLs

### Documentation
3. **`NETLIFY_DEPLOYMENT.md`** - Complete deployment guide
   - All deployment methods explained
   - Troubleshooting tips
   - Best practices

4. **`examples/DEPLOYMENT.md`** - Quick start guide
   - Fast reference for common tasks
   - Links to full documentation

### Helper Scripts
5. **`deploy-plugins.sh`** - One-command deployment script
   - Builds and deploys in one step
   - Supports `--prod` flag for production

## Quick Deploy (3 Methods)

### Method 1: One-Command Script ⚡ (Easiest)

```bash
# Preview deploy
./deploy-plugins.sh

# Production deploy
./deploy-plugins.sh --prod
```

### Method 2: Netlify CLI 🛠️

```bash
# First time only
netlify login
netlify init

# Deploy
yarn build:examples
netlify deploy --prod --dir=examples/dist
```

### Method 3: Drag & Drop 🖱️ (No CLI needed)

1. Run: `yarn build:examples`
2. Visit: https://app.netlify.com/drop
3. Drag `examples/dist` folder
4. Done! Get your URL

## Your Deployed Plugins

After deployment, plugins will be available at:

```
https://YOUR-SITE.netlify.app/
├── index.html                      # Landing page (auto-generated)
├── jadalnia-plugin.js              # Dining hall automation
├── combat-alert-plugin.js          # Combat statistics
├── example-plugin.js               # Feature demo
└── simple-highlighter-plugin.js    # Basic highlighting
```

## Using Plugins in Arkadia Client

1. **Deploy** plugins (choose method above)
2. **Copy** the plugin URL (e.g., `https://your-site.netlify.app/jadalnia-plugin.js`)
3. **Open** Arkadia Web Client
4. **Click** "Skrypty" (Scripts) in the menu
5. **Paste** the plugin URL
6. **Click** "Dodaj" (Add)
7. **Done!** Plugin is active immediately

## Example URLs

Once deployed, use these in the client:

```
https://your-site.netlify.app/jadalnia-plugin.js
https://your-site.netlify.app/combat-alert-plugin.js
https://your-site.netlify.app/example-plugin.js
```

## Jadalnia Plugin Usage

After loading the plugin:
- Type `/jadalnia_ra` to start automation
- Type `/jadalnia_stop` to stop manually
- Go to a dining hall - it will eat and drink automatically!

## Continuous Deployment (Optional)

For automatic deployments on every git push:

1. **Push** your repo to GitHub/GitLab
2. **Go to** [Netlify Dashboard](https://app.netlify.com/)
3. **Click** "Add new site" → "Import an existing project"
4. **Connect** your Git repository
5. **Configure:**
   - Build command: `yarn build:examples`
   - Publish directory: `examples/dist`
   *(Auto-detected from netlify.toml)*
6. **Deploy!**

Now every push automatically deploys! 🚀

## Local Testing Before Deploy

Always test locally first:

```bash
# Build
yarn build:examples

# Start local server
yarn serve:examples

# Visit http://localhost:3030
# Test with: http://localhost:3030/plugins/jadalnia-plugin.js
```

## File Structure

```
arkadia-web-client-extension/
├── netlify.toml                 # Netlify config ✅
├── deploy-plugins.sh            # Deploy script ✅
├── NETLIFY_DEPLOYMENT.md        # Full guide ✅
├── examples/
│   ├── DEPLOYMENT.md            # Quick guide ✅
│   ├── dist/
│   │   ├── index.html           # Landing page ✅
│   │   ├── jadalnia-plugin.js   # Built plugins ✅
│   │   └── ...
│   ├── jadalnia-plugin.ts       # Source files
│   └── ...
```

## Next Steps

### Deploy Your Plugins:

**Option A - Quick Deploy:**
```bash
./deploy-plugins.sh --prod
```

**Option B - Manual Deploy:**
```bash
yarn build:examples
netlify deploy --prod --dir=examples/dist
```

**Option C - Drag & Drop:**
1. `yarn build:examples`
2. Drag `examples/dist` to https://app.netlify.com/drop

### Use Your Plugins:

1. Get the Netlify URL from deployment output
2. Add in Arkadia client Scripts section
3. Enjoy your automated scripts!

## Configuration Details

### CORS Headers (netlify.toml)
```toml
[[headers]]
  for = "/*.js"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Content-Type = "application/javascript; charset=utf-8"
```

This allows plugins to be loaded from any domain (cross-origin).

### Build Process
1. Netlify runs `yarn install`
2. Netlify runs `yarn build:examples`
3. Compiles all `*-plugin.ts` files
4. Outputs to `examples/dist/`
5. Deploys with proper headers

## Monitoring & Management

- **View deployments:** `netlify open:site`
- **Check logs:** Netlify Dashboard → Deploys → Build logs
- **Rollback:** Dashboard → Find old deploy → "Publish deploy"
- **Custom domain:** Dashboard → Domain settings

## Cost

**Netlify Free Tier:**
- ✅ 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN
- ✅ Instant rollbacks

Perfect for hosting plugins!

## Troubleshooting

**Plugins don't load in client?**
- Check CORS headers (should be set in netlify.toml ✅)
- Verify URL ends with `.js`
- Check browser console (F12) for errors

**Build fails?**
- Check Netlify build logs
- Verify `yarn build:examples` works locally
- Check Node version compatibility

**Can't deploy?**
- Install CLI: `npm install -g netlify-cli`
- Login: `netlify login`
- Initialize: `netlify init`

## Resources

- 📖 [Full Deployment Guide](./NETLIFY_DEPLOYMENT.md)
- 📖 [Quick Start](./examples/DEPLOYMENT.md)
- 📖 [Script Migration Guide](./docs/SCRIPT_MIGRATION_GUIDE.md)
- 🔌 [Plugin Examples](./examples/)
- 🌐 [Netlify Docs](https://docs.netlify.com/)

## Success Checklist

- [x] Configuration files created
- [x] Landing page generated
- [x] Deploy script ready
- [x] Documentation complete
- [x] Build tested locally
- [ ] Deploy to Netlify (your turn!)
- [ ] Test plugin in Arkadia client
- [ ] Share with other players!

---

## Ready to Deploy? 🚀

```bash
# Just run this:
./deploy-plugins.sh --prod

# Then use your plugins:
# https://YOUR-SITE.netlify.app/jadalnia-plugin.js
```

That's it! Your plugins are ready to share with the world! 🎉
