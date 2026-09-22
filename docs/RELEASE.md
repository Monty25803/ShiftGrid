<p align="center">
  <img src="../public/logo.svg" alt="ShiftGrid" width="64" height="64" />
</p>

<h1 align="center">Release · automatic tag + <code>.exe</code></h1>

<p align="center">
  <img alt="auto" src="https://img.shields.io/badge/on%20push-auto%20tag%20%2B%20notes%20%2B%20exe-1F6F5B" />
</p>

---

## What happens when you push

Push to **`main`** or **`master`**:

```
git push origin main
        │
        ▼
   Quality checks
        │
        ▼
   Auto-create next tag  (v0.1.0 → v0.1.1 → …)
        │
        ▼
   Build Windows NSIS .exe
        │
        ▼
   GitHub Release + release notes + .exe attached
```

You do **not** need to create a tag by hand.

| Skip this push | Put `[skip release]` in the commit message |
|----------------|--------------------------------------------|

---

## First time

1. Push your code to `main` / `master`  
2. Open **Actions** → workflow **Release** (must be green)  
3. Open **Releases** → download the Setup `.exe`  

Default first tag if none exist: **`v0.1.0`**, then patch bumps (`v0.1.1`, …).

---

## Manual run

GitHub → **Actions** → **Release** → **Run workflow** (same pipeline).

---

## Local installer (no CI)

```bash
npm run desktop:dist
```

Output: `dist-desktop/`

---

## Optional helper

`npm run release -- x.y.z` still works if you want a **specific** version tag locally, then push it — but normal flow is just:

```bash
git push origin main
```

---

## Preference

| Audience | Get |
|----------|-----|
| Offline shop PC | `.exe` from the new Release |
| Web / server | Docker — [DEPLOYMENT.md](DEPLOYMENT.md) |

→ [GETTING_STARTED.md](GETTING_STARTED.md)
