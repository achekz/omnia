# Fix User Role Validation Error - Progress Tracker

## Status: 🔄 In Progress

### Step 1: ✅ Model enum updated & fixUserRoles.js created
- Update `server/models/User.js` enum to include `['ADMIN', 'MANAGER', 'EMPLOYEE', 'STUDENT', 'ACCOUNTANT', 'USER', 'COMPANY_ADMIN', 'CABINET_ADMIN']`
- Create `server/seed/fixUserRoles.js` to clean DB: remove/update invalid roles to 'EMPLOYEE'

### Step 2: ✅ Login uses findByIdAndUpdate
- In `server/controllers/authController.js`: Replace `user.save()` with `findByIdAndUpdate` for refreshToken/lastLogin to bypass full validation.

### Step 3: ✅ Main seeds (demo, test) roles UPPERCASE
- `server/seed/createDemoAccounts.js`: 'user'→'USER', 'company_admin'→'COMPANY_ADMIN', etc.
- `server/seed/createTestAccount.js`
- Other seeds (seed.js, etc.)

### Step 4: ✅ Services/controllers comparisons fixed
- services/controllers: 'user'→'USER', 'company_admin'→'COMPANY_ADMIN', etc.
- Use search_files to find all, then edit_file.

### Step 5: [ ] Test & Cleanup
- Run `cd server && node seed/fixUserRoles.js`
- Run updated createDemoAccounts.js
- Restart server, test login
- Update this TODO.md ✅ as completed
- attempt_completion

**Instructions:** Server must be stopped before running seeds. Test with employee@demo.com / demo123
