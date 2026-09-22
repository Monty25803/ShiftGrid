<p align="center">
  <img src="../public/logo.svg" alt="ShiftGrid" width="56" height="56" />
</p>

<h1 align="center">Launch checklist · v0.1</h1>

<p align="center"><img alt="alpha" src="https://img.shields.io/badge/channel-alpha-C48C3C" /></p>

---

## Web / Docker

- [ ] Strong `AUTH_SECRET`  
- [ ] `DATABASE_URL` reachable  
- [ ] `prisma migrate deploy` OK  
- [ ] Setup or seed users  
- [ ] Manager + Staff sign-in  
- [ ] Schedule create / move / assign  
- [ ] Swap offer → accept → approve  
- [ ] Inbox events  
- [ ] (Optional) VAPID push  

## Windows desktop

- [ ] `npm run desktop` or install Release `.exe`  
- [ ] Data under `%APPDATA%\ShiftGrid`  
- [ ] Admin backup folder + OneDrive/Drive path  
- [ ] **Backup now** creates JSON locally + in sync folder  

## Release

- [ ] Push to `main` (auto tag + `.exe` + notes) **or** commit with `[skip release]`
- [ ] GitHub Release shows notes + installer artifact
- [ ] [CHANGELOG.md](../CHANGELOG.md) updated for notable changes

## Docs

- [ ] [GETTING_STARTED.md](GETTING_STARTED.md) preference clear  
- [ ] README quick start verified on a clean machine  
