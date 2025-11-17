#!/bin/bash

# Deploy Plugins to Netlify
# This script builds and deploys the example plugins to Netlify

set -e  # Exit on error

echo "🚀 Deploying Arkadia Plugins to Netlify"
echo "========================================"

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI is not installed."
    echo "Install it with: npm install -g netlify-cli"
    exit 1
fi

# Build the plugins
echo ""
echo "📦 Building plugins..."
yarn build:examples

if [ $? -eq 0 ]; then
    echo "✓ Plugins built successfully"
else
    echo "❌ Build failed"
    exit 1
fi

# Check what's in dist
echo ""
echo "📋 Files to deploy:"
ls -lh examples/dist/

# Deploy to Netlify
echo ""
echo "🌐 Deploying to Netlify..."
echo ""

# Check if --prod flag is passed
if [ "$1" == "--prod" ]; then
    echo "Deploying to PRODUCTION..."
    netlify deploy --prod --dir=examples/dist
else
    echo "Deploying to PREVIEW (use --prod for production)..."
    netlify deploy --dir=examples/dist
fi

echo ""
echo "✓ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the deployment URL from above"
echo "2. Open Arkadia Web Client"
echo "3. Go to Scripts section"
echo "4. Add: https://your-url.netlify.app/jadalnia-plugin.js"
echo ""
