# Plugin Deployment Quick Start

## Quick Deploy to Netlify

### Option 1: Using the Deploy Script (Easiest)

```bash
# From project root
./deploy-plugins.sh         # Preview deploy
./deploy-plugins.sh --prod  # Production deploy
```

### Option 2: Using Netlify CLI Directly

```bash
# Build
yarn build:examples

# Deploy preview
netlify deploy --dir=examples/dist

# Deploy production
netlify deploy --prod --dir=examples/dist
```

### Option 3: Drag & Drop (No CLI needed)

1. Build: `yarn build:examples`
2. Go to: https://app.netlify.com/drop
3. Drag the `examples/dist` folder
4. Get your URL!

## First Time Setup

If you haven't deployed before:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize your site
netlify init
```

Follow the prompts to create your site.

## Using Your Plugins

After deploying, your plugins will be at:

```
https://YOUR-SITE.netlify.app/jadalnia-plugin.js
https://YOUR-SITE.netlify.app/combat-alert-plugin.js
https://YOUR-SITE.netlify.app/example-plugin.js
https://YOUR-SITE.netlify.app/simple-highlighter-plugin.js
```

### In Arkadia Client:

1. Open Arkadia Web Client
2. Click "Skrypty" (Scripts) in menu
3. Paste plugin URL
4. Click "Dodaj" (Add)
5. Plugin loads automatically!

## Local Development

```bash
# Build plugins
yarn build:examples

# Start dev server
yarn serve:examples

# Visit http://localhost:3030
```

Use `http://localhost:3030/plugins/jadalnia-plugin.js` for local testing.

## Files Structure

```
examples/
├── dist/                           # Built plugins (deployed to Netlify)
│   ├── index.html                 # Landing page
│   ├── jadalnia-plugin.js         # Your plugins
│   ├── combat-alert-plugin.js
│   └── ...
├── jadalnia-plugin.ts             # Source files
├── combat-alert-plugin.ts
└── ...
```

## Continuous Deployment

For automatic deployments on every push:

1. Push your repo to GitHub
2. Connect it to Netlify
3. Set build command: `yarn build:examples`
4. Set publish directory: `examples/dist`
5. Every push auto-deploys!

## Full Documentation

See [NETLIFY_DEPLOYMENT.md](../NETLIFY_DEPLOYMENT.md) for complete deployment guide.
