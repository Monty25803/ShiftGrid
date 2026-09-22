<p align="center">
  <img src="../public/logo.svg" alt="ShiftGrid" width="72" height="72" />
</p>

<h1 align="center">Choose how you run ShiftGrid</h1>

<p align="center">
  <img alt="web" src="https://img.shields.io/badge/mode-Web%20%2F%20Docker-1F6F5B" />
  <img alt="desktop" src="https://img.shields.io/badge/mode-Windows%20Desktop-C48C3C" />
  <img alt="offline" src="https://img.shields.io/badge/offline-first-163F36" />
</p>

---

## Pick your preference

| | **A · Web / Server** | **B · Windows Desktop app** |
|--|----------------------|-------------------------------|
| **Best when** | Always-on PC or VPS, several devices on LAN | One shop PC, weak or no daytime internet |
| **Data lives** | Your Postgres (Docker / cloud) | This PC `%APPDATA%\ShiftGrid` |
| **User opens** | Browser → `http://…` | **ShiftGrid.exe** window |
| **Cloud** | Host wherever you like | Nightly backup → OneDrive / Drive / Dropbox |
| **Start** | `npm run dev` or Docker | `npm run desktop` or install `.exe` |

> Both modes share the same product features (schedule, swaps, team, timesheet).  
> Choose once for your shop — you can switch later by migrating a backup JSON.

---

### Preference A — Web (browser)

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # or: npm run db:pg
npm install --legacy-peer-deps
npx prisma migrate deploy
npm run db:seed          # optional demo
npm run dev
```

Open **http://localhost:3000** → sign in or **/setup**.

Production: [DEPLOYMENT.md](DEPLOYMENT.md)

---

### Preference B — Windows app (offline daytime)

```bash
npm install --legacy-peer-deps
npm run desktop
```

Or install a release build from GitHub **Releases** (`.exe` / NSIS installer).

Night backup + cloud sync folder: [WINDOWS_DESKTOP.md](WINDOWS_DESKTOP.md)

---

## Demo logins (seeded)

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `password123` | ADMIN |
| `manager@demo.local` | `password123` | MANAGER |
| `staff@demo.local` | `password123` | STAFF |

---

## Next docs

| Doc | Purpose |
|-----|---------|
| [USER_GUIDE.md](USER_GUIDE.md) | Day-to-day product use |
| [WINDOWS_DESKTOP.md](WINDOWS_DESKTOP.md) | Offline PC + nightly cloud folder |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Server / Docker / PaaS |
| [RELEASE.md](RELEASE.md) | Tag, `.exe`, release notes |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Ship checklist |
