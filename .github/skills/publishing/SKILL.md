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
2. **Build the package:**
   ```powershell
   npm run build
   ```
3. **Bump the version** (choose one):
   ```powershell
   npm version patch   # bug fixes
   npm version minor   # new features
   npm version major   # breaking changes
   ```
4. **Publish to npm:**
   ```powershell
   npm publish
   ```
5. **Verify** the package is live at [npmjs.com/package/sbox-mcp-documentation](https://www.npmjs.com/package/sbox-mcp-documentation)

## Notes

- Must be logged in: `npm login`
- Update `README.md` for any user-facing changes before publishing
- Optional: tag the release in git:
  ```powershell
  git tag vX.Y.Z ; git push --tags
  ```
