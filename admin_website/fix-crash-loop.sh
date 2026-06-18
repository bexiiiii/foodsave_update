#!/bin/bash

# Script to fix Next.js crash loop issues
# Fixes: localStorage SSR errors, uncaught exceptions, build cache issues

echo "🔧 Fixing Next.js crash loop..."

cd /Applications/development/foodsavee/admin_website

echo "📦 Stopping PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

echo "🗑️  Cleaning build cache and artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "🔨 Rebuilding project..."
bun run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Starting with PM2..."
    pm2 start npm --name "admin-website" -- start
    pm2 save
    
    echo ""
    echo "📊 PM2 Status:"
    pm2 list
    
    echo ""
    echo "✅ Done! Monitor with: pm2 logs admin-website"
else
    echo "❌ Build failed! Check errors above."
    exit 1
fi
