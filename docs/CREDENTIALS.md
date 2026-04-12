# Credentials Management Guide

## Overview

This project has been configured to safely manage credentials outside of git. All sensitive information (passwords, tokens, API keys) are now loaded from environment files that are **git-ignored**.

## Files

### `.env.example` (📤 Committed to git)
- **Purpose**: Template file showing all available configuration options
- **Contains**: Example credential structure only (no real values)
- **Usage**: Reference for setting up your local environment
- **Action**: Commit this to git

### `.env.local` (📭 NOT committed to git - git-ignored)
- **Purpose**: Your actual local credentials and configuration
- **Contains**: Real passwords, API keys, tokens
- **Usage**: Used by scripts and applications locally
- **Action**: NEVER commit this file
- **Setup**: Copy from `.env.example` and fill in your actual values

## How to Use

### 1. Initial Setup
```bash
# Copy the example file to create your local credentials file
cp .env.example .env.local

# Edit .env.local and replace example values with your actual credentials
nano .env.local  # or your preferred editor
```

### 2. Running Scripts

Scripts like `test_teams.sh` now automatically load from `.env.local`:
```bash
./test_teams.sh  # Automatically loads credentials from .env.local
```

### 3. Running Docker/Node Services

When starting services, load the `.env.local` file:
```bash
# Docker Compose
docker-compose --env-file .env.local up

# Node.js applications
npm start  # Will auto-load .env.local if you have dotenv installed
```

## Configuration Variables

### Authentication Credentials
```env
ANALYST_EMAIL=analyst@company.com
ANALYST_PASSWORD=analyst123

DEPLOYER_EMAIL=deployer@company.com
DEPLOYER_PASSWORD=deploy123

DEVELOPER_EMAIL=developer@company.com
DEVELOPER_PASSWORD=dev123

ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=admin123
```

### Server Configuration
```env
OAUTH_SERVER_URL=http://localhost:3000
OAUTH_TOKEN_ENDPOINT=/oauth/token
GATEWAY_PORT=3000
GATEWAY_JWT_SECRET=your-super-secret-jwt-key-change-this
```

### Dashboard & Database
```env
DASHBOARD_PORT=5173
ANALYTICS_DB_HOST=localhost
ANALYTICS_DB_PASSWORD=postgres
```

## Files Modified for Credentials

### ✅ Already Updated
- `test_teams.sh` - Now reads from `.env.local`
- `gateway/src/auth/oauth-server.ts` - Now reads from environment variables
- `dashboard/src/App.tsx` - Removed hardcoded defaults

### 📋 Reference Documentation
- `docs/TEAMS.md` - Contains credential examples for reference (documentation only)
- `README.md` - Contains credential examples for reference (documentation only)

## Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore` for a reason
2. **Change default credentials** - Replace example values with strong, unique passwords
3. **Rotate credentials regularly** - Update `.env.local` and redeploy
4. **Use secrets management** - For production, use proper secret vaults (AWS Secrets Manager, HashiCorp Vault, etc.)
5. **Audit access** - Keep track of who has access to `.env.local`

## Verification

To verify credentials are properly excluded from git:
```bash
# This should show NO credential files
git status --ignored

# This should NOT list .env.local or other credential files
git ls-files --ignored --exclude-standard
```

## Troubleshooting

### Scripts fail with "Bearer undefined" error
- Ensure `.env.local` exists in the project root
- Verify `OAUTH_SERVER_URL` is set correctly
- Check that credentials are valid

### "Warning: .env.local not found" message
- Create `.env.local` from `.env.example`:
  ```bash
  cp .env.example .env.local
  ```

### Docker services not picking up credentials
- Pass the env file to docker-compose:
  ```bash
  docker-compose --env-file .env.local up
  ```

## For Contributors

When sharing this project:
1. ✅ Commit `.env.example` (template only)
2. ✅ Commit updated `.gitignore`
3. ❌ Never commit `.env.local` (already git-ignored)
4. 📝 Include this guide in project documentation

New contributors should:
1. Clone the project
2. Copy `.env.example` to `.env.local`
3. Update `.env.local` with their own credentials
4. Run scripts/services as usual
