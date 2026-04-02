# 🚀 Release Process (`RELEASING.md`)

This document defines the mandatory steps for releasing a new version of this project. Following this process ensures stability, security, and a clear audit trail.

---

## 🚦 Pre-Release Requirements

Before initiating a release, ensure:
* **Branch:** You are on the `main` branch.
* **CI Status:** All GitHub Actions/Workflows are passing (🟢).
* **Clean Slate:** You have no uncommitted changes (`git status`).
* **Permissions:** You have `maintainer` access to the GitHub repo.

---

## 🛠 Step-by-Step Execution

### 1. Synchronize & Verify
Ensure your local environment matches the remote and is free of vulnerabilities.
```bash
git checkout main
git pull origin main
npm ci
npm run build test
```

### 2. Version Bump
We use standard **SemVer** (Semantic Versioning). Run one of the following commands to update `package.json` and `npm-shrinkwrap.json`. This also creates a local git tag and update shorter tag references.
For example like v3 and v3.5 for the latest tag created as v3.5.10

| Change Type | Command | Description |
| :--- | :--- | :--- |
| **Patch** | `npm version patch` | Bug fixes (1.0.0 → 1.0.1) |
| **Minor** | `npm version minor` | New features, no breaking changes (1.0.0 → 1.1.0) |
| **Major** | `npm version major` | Breaking changes (1.0.0 → 2.0.0) |

### 3. Build & Package Check
Verify that the package bundles correctly before pushing.
```bash
npm run build
```

### 4. Push Changes
Push the version commit and the new tag to the remote repository.
```bash
git push origin main --follow-tags
```

---

## 🚢 Publishing & Documentation

### 1. GitHub Release
Once the tag is pushed, finalize the release on GitHub:
1. Go to **Releases** > **Draft a new release**.
2. Select the tag you just pushed (e.g., `v1.2.3`).
3. Click **"Generate release notes"** to automatically pull in PR titles.
4. Review the notes and categorize them (Features, Fixes, etc.).
5. Click **Publish Release**.

### 2. NPM Registry
There is an automatic GH workflow publish.yml to do that.
You can of course run it manually what is there declared to do.

---

## ⚠️ Troubleshooting & Rollbacks

### If the Build Fails After Tagging
If you've created a tag but the build fails, you must delete the tag locally and remotely before trying again:
```bash
git tag -d vX.Y.Z
git push --delete origin vX.Y.Z
```

---

## 📜 Post-Release
* Announce the release in the project communication channel.
* Update any documentation sites if they are not automatically synced.

---

> **Note to Maintainers:** Never skip `npm test` during the release process. A "small fix" that breaks the build is still a broken release.
