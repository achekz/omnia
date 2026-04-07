#!/bin/bash

# Fix for blank page on npm run dev

echo "🔧 Fixing blank page issue..."

# 1. Clean node_modules and cache
echo "1️⃣ Cleaning node_modules and cache..."
rm -rf node_modules
rm -rf .vite
rm package-lock.json

# 2. Clear npm cache
echo "2️⃣ Clearing npm cache..."
npm cache clean --force

# 3. Reinstall dependencies
echo "3️⃣ Reinstalling dependencies..."
npm install

# 4. Clear build cache
echo "4️⃣ Clearing build cache..."
rm -rf dist

echo "✅ Done! Run: npm run dev"
