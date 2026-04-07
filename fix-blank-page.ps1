# Fix for blank page on npm run dev (Windows PowerShell)

Write-Host "🔧 Fixing blank page issue..." -ForegroundColor Green

# 1. Clean node_modules and cache
Write-Host "1️⃣ Cleaning node_modules and cache..." -ForegroundColor Cyan
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue

# 2. Clear npm cache
Write-Host "2️⃣ Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

# 3. Reinstall dependencies
Write-Host "3️⃣ Reinstalling dependencies..." -ForegroundColor Cyan
npm install

# 4. Clear build cache
Write-Host "4️⃣ Clearing build cache..." -ForegroundColor Cyan
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Done! Run: npm run dev" -ForegroundColor Green
