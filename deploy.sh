#!/bin/bash

echo "🚀 Deploying CipherChat to Netlify..."

# Build the frontend
echo "📦 Building frontend..."
cd frontend && npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Frontend build successful"

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
npx netlify deploy --prod --dir=build --site=cipherchat-client

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎉 CipherChat is now live at: https://cipherchat-client.netlify.app"
else
    echo "❌ Deployment failed"
    exit 1
fi

echo "🎯 Deployment process completed!"
