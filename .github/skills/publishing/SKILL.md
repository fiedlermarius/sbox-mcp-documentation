---
name: publishing
description: 'Publish documentation_mcp to npm. Use when bumping the version, releasing a new build, or verifying the package on npmjs.com. Covers build, versioning, publish steps, and git tagging.'
argument-hint: 'patch | minor | major'
---

# Publishing documentation_mcp

## When to Use

- Releasing a new version of the package to npm
- After user-facing changes that require a version bump
- To verify the published package on npmjs.com

## Procedure

1. **Ensure a clean state** — all changes committed, no uncommitted files
2. **Bump the version and create a git tag** (choose one):
   ```powershell
   npm version patch   # bug fixes  → v0.1.x
   npm version minor   # new features → v0.x.0
   npm version major   # breaking changes → vx.0.0
   ```
   This updates `package.json`, commits the change, and creates a `vX.Y.Z` git tag automatically.
3. **Push the commit and tag:**
   ```powershell
   git push --follow-tags
   ```
   This triggers the GitHub Actions `release` workflow which:
   - Builds the package
   - Publishes to npm via OIDC (no secrets required)
   - Creates a GitHub Release with auto-generated release notes

## Manual publish (fallback)

If CI is not set up or you want to publish locally:
```powershell
npm run build ; npm publish
```

## First-time setup

This workflow uses **npm Trusted Publishing** (OIDC) — no secrets or tokens needed in GitHub.

One-time configuration on npmjs.com:
1. Go to [npmjs.com/package/sbox-mcp-documentation](https://www.npmjs.com/package/sbox-mcp-documentation) → Settings → Trusted Publishing
2. Select **GitHub Actions** and fill in the repository details to allow the `release` workflow to publish on your behalf.

## Notes

- Must be logged into npm for manual publishes: `npm login`
- Update `README.md` for any user-facing changes before publishing
- Verify the release at [npmjs.com/package/sbox-mcp-documentation](https://www.npmjs.com/package/sbox-mcp-documentation)
