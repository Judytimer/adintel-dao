# AdIntel DAO Security Fix Guide

## 🚨 Urgent Fix Steps

### 1. Fix Dependency Vulnerabilities

```bash
# Step 1: Update DOMPurify (Most Critical)
npm install dompurify@3.2.6 --save

# Step 2: Update development dependencies
npm install web-ext@8.8.0 --save-dev

# Step 3: Run automatic fixes
npm audit fix

# Step 4: Verify fix results
npm audit
```

### 2. Fix ESLint Configuration

Due to version incompatibility, a complete update of the ESLint ecosystem is required:

```bash
# Remove old versions
npm uninstall @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint

# Install compatible new versions
npm install --save-dev eslint@8.57.1 @typescript-eslint/eslint-plugin@7.18.0 @typescript-eslint/parser@7.18.0

# Test
npm run lint
```

### 3. Strengthen CSP Security Policy

Modify `src/extension/manifest.json`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; style-src 'self'; object-src 'none'"
  }
}
```

Then refactor all code using inline styles to use external CSS files or CSS-in-JS.

### 4. Implement Security Best Practices

#### 4.1 Create Security Check Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "security:check": "npm audit && npm run lint",
    "security:fix": "npm audit fix && npm run lint:fix"
  }
}
```

#### 4.2 Add Pre-commit Hooks

Install husky:
```bash
npm install --save-dev husky
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
npm run security:check
npm run typecheck
```

## 📋 Long-term Maintenance Recommendations

### 1. Regular Dependency Updates

Run monthly:
```bash
npm outdated
npm update
npm audit
```

### 2. Use Dependabot

Enable Dependabot in your GitHub repository to automatically detect and fix security vulnerabilities.

### 3. Implement Code Review Process

- All code changes must go through PRs
- PRs must pass all security checks
- At least one reviewer approval required

### 4. Monitor Runtime Security

Consider integrating:
- Sentry for error monitoring
- Content Security Policy reporting endpoint

## ⚠️ Important Notes

1. **Test all fixes**: After applying these fixes, ensure you run the complete test suite.
2. **Gradual implementation**: Test in development environment first, then deploy to production.
3. **Backup important data**: Ensure you have code and data backups before major updates.

## 🔍 Verification Checklist

- [ ] All dependency vulnerabilities fixed
- [ ] ESLint runs successfully
- [ ] CSP policy updated
- [ ] All tests pass
- [ ] Extension works properly in browser
- [ ] No new security warnings

---

For any issues, please contact the security team or refer to the project's security policy.