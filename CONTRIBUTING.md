<p align="center">
  <img src="public/logo.svg" alt="ShiftGrid" width="56" height="56" />
</p>

<h1 align="center">Contributing</h1>

<p align="center">
  <img alt="prs" src="https://img.shields.io/badge/PRs-welcome-1F6F5B" />
  <img alt="quality" src="https://img.shields.io/badge/CI-lint%20·%20types%20·%20tests-163F36" />
</p>

---

## Setup (pick a run mode)

See **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**.

```bash
cp .env.example .env
npm install --legacy-peer-deps
# Web:
docker compose -f docker-compose.dev.yml up -d   # or npm run db:pg
npx prisma migrate dev && npm run db:seed && npm run dev
# Desktop:
npm run desktop
```

---

## Before a PR

```bash
npm run lint
npm run typecheck
npm test
```

---

## Guidelines

- Scope every query by `organizationId`  
- Prefer Route Handlers under `src/app/api`  
- Extend labor/swap tests in `src/lib/labor-rules.ts`  
- Never commit `.env`  

## Roles

| Role | Access |
|------|--------|
| ADMIN | Org settings, team (all roles), backup, audit |
| MANAGER | Schedule, swap approve, staff team, audit |
| STAFF | Own schedule, swaps, clock, profile |

## Releases

Push to `main` → automatic tag + Windows `.exe` + release notes.  
→ [docs/RELEASE.md](docs/RELEASE.md)
