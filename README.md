<p align="center">
  <img src="public/logo.svg" alt="ShiftGrid logo" width="96" height="96" />
</p>

<h1 align="center">ShiftGrid</h1>

<p align="center">
  <strong>Digital workforce scheduling</strong> for cafés, clinics &amp; retail.<br/>
  Self-hostable · Offline-capable · No per-seat SaaS tax
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.0--alpha-1F6F5B?style=for-the-badge" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-C48C3C?style=for-the-badge" />
  <img alt="modes" src="https://img.shields.io/badge/modes-Web%20%2B%20Windows-163F36?style=for-the-badge" />
</p>

<p align="center">
  <a href="docs/GETTING_STARTED.md"><strong>Getting started</strong></a> ·
  <a href="docs/USER_GUIDE.md">User guide</a> ·
  <a href="docs/WINDOWS_DESKTOP.md">Windows app</a> ·
  <a href="docs/RELEASE.md">Release / .exe</a> ·
  <a href="docs/DEPLOYMENT.md">Deploy</a>
</p>

---

## Run preference — pick one

| Preference | Command | Opens |
|------------|---------|-------|
| **Web** (browser, LAN / server) | `npm run dev` or Docker | http://localhost:3000 |
| **Windows Desktop** (offline daytime) | `npm run desktop` or install `.exe` | ShiftGrid app window |

Full chooser → **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**

```bash
# Web
cp .env.example .env && npm install --legacy-peer-deps
npm run db:pg          # terminal 1 — or use Docker Compose
npx prisma migrate deploy && npm run db:seed && npm run dev

# Windows app
npm install --legacy-peer-deps && npm run desktop
```

| Demo | Password | Role |
|------|----------|------|
| `admin@demo.local` | `password123` | ADMIN |
| `manager@demo.local` | `password123` | MANAGER |
| `staff@demo.local` | `password123` | STAFF |

---

## Product

```
 Schedule ── Swaps ── Timesheet ── Team ── Audit ── Inbox
     │         │          │         │
  agenda    OT/break   actual vs   create IDs
  week/month checks    scheduled   (admin)
```

- Drag-and-drop week grid + mobile agenda + month view  
- Peer / marketplace swaps with labor-rule checks  
- Admin labor configurator (timezone, OT, breaks, coverage)  
- Offline backup → OneDrive / Google Drive / Dropbox sync folder  

---

## Ship a Windows `.exe`

Push to `main` / `master` — CI **auto-tags**, builds the installer, and publishes a GitHub Release with notes + `.exe`:

```bash
git push origin main
```

Skip one push: add `[skip release]` to the commit message.  
Details → **[docs/RELEASE.md](docs/RELEASE.md)** · Notes → **[CHANGELOG.md](CHANGELOG.md)**

---

## Stack

| Layer | Tech |
|-------|------|
| App | Next.js App Router |
| Auth | Auth.js credentials |
| DB | PostgreSQL + Prisma (embedded on desktop) |
| Desktop | Electron |
| Deploy | Docker Compose · GitHub Releases |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Web development |
| `npm run desktop` | Windows desktop app |
| `npm run desktop:dist` | Local Windows installer |
| `npm run release -- x.y.z` | Tag for CI release |
| `npm run backup` | JSON backup now |
| `npm test` / `lint` / `typecheck` | Quality gates |

---

## License

MIT — [LICENSE](LICENSE)
