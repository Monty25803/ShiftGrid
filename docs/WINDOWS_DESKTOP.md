<p align="center">
  <img src="../public/logo.svg" alt="ShiftGrid" width="64" height="64" />
</p>

<h1 align="center">Windows desktop · Offline-first</h1>

<p align="center">
  <img alt="offline" src="https://img.shields.io/badge/daytime-offline-1F6F5B" />
  <img alt="night" src="https://img.shields.io/badge/night-cloud%20sync%20folder-C48C3C" />
  <img alt="exe" src="https://img.shields.io/badge/ship-.exe%20via%20GitHub%20Release-163F36" />
</p>

<p align="center"><a href="GETTING_STARTED.md">Run preference</a> · <a href="RELEASE.md">Build / tag .exe</a></p>

---

## Why shops choose this mode

| Daytime | Night |
|---------|-------|
| No internet required | Auto JSON backup on the PC |
| Data in `%APPDATA%\ShiftGrid` | Copy into OneDrive / Google Drive / Dropbox |
| Native **app window** (not a browser tab) | Sync client uploads when online |

```
┌──────────────────────────────┐
│  ShiftGrid.exe (Electron)    │
│   Next.js UI + API           │
│   Postgres in AppData        │
│           │                  │
│           ▼ 22:00            │
│   backups\ + OneDrive\...    │
└──────────────────────────────┘
```

---

## Start (development)

```bash
npm install --legacy-peer-deps
npm run desktop
```

Tray menu: **Open** · **Backup now** · **Open data folder** · **Quit**

---

## Install from GitHub Release

1. Open the repo **Releases**  
2. Download the NSIS **Setup `.exe`**  
3. Install → desktop + Start Menu shortcuts  
4. Sign in / run **Setup** once  

How CI publishes those files → [RELEASE.md](RELEASE.md)

---

## Night cloud backup

Admin → **Settings → Offline backup**

1. Enable nightly (default `22:00`)  
2. Keep local backup folder  
3. Set **Cloud sync folder** e.g. `C:\Users\You\OneDrive\ShiftGridBackups`  
4. **Backup now** once to verify  

---

## Build installer locally

```bash
npm run desktop:dist
```

Output: `dist-desktop/`

---

## Web vs Desktop

| | Web / Docker | Windows desktop |
|--|--------------|-----------------|
| Internet daytime | Usually yes | Optional |
| Multi-device | Easy on LAN | One primary PC |
| Artifact | Container / URL | `.exe` |

Same features either way — see [GETTING_STARTED.md](GETTING_STARTED.md).
