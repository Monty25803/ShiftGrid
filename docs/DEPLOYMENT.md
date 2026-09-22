<p align="center">
  <img src="../public/logo.svg" alt="ShiftGrid" width="64" height="64" />
</p>

<h1 align="center">Deployment · Web / Server</h1>

<p align="center">
  <img alt="docker" src="https://img.shields.io/badge/Docker-Compose-1F6F5B" />
  <img alt="paas" src="https://img.shields.io/badge/PaaS-Railway%20·%20Fly%20·%20Render-C48C3C" />
</p>

<p align="center">
  Prefer a shop PC with no daytime internet? → <a href="WINDOWS_DESKTOP.md">Windows desktop</a><br/>
  Prefer chooser? → <a href="GETTING_STARTED.md">Getting started</a>
</p>

---

## Architecture

```
Browser  →  Next.js (UI + API)  →  PostgreSQL
                 ↓
            Web Push / Email (optional)
```

---

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres URL |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Prod | `true` behind proxies |
| `NEXTAUTH_URL` | Yes | Public HTTPS URL |
| VAPID_* | No | Web Push |
| `SMTP_URL` | No | Marks email outbox as sent |

Copy [`.env.example`](../.env.example). Never commit `.env`.

---

## Docker Compose (recommended)

```bash
cp .env.example .env
# set AUTH_SECRET + NEXTAUTH_URL
docker compose up --build -d
docker compose exec app npx prisma db seed   # optional
```

- App: port **3000**  
- Postgres is **not** published publicly (compose `expose` only)  
- Health: `GET /api/health`

### HTTPS

Put Caddy / Nginx / Traefik in front. Set `NEXTAUTH_URL` to the public URL, recreate the app container.

### Backup DB

```bash
docker compose exec -T db pg_dump -U shiftgrid shiftgrid > backup.sql
```

---

## Railway / Render / Fly.io

1. Provision Postgres → `DATABASE_URL`  
2. Deploy Dockerfile  
3. Set `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL`  
4. Seed once via platform shell  

---

## Manual Node

```bash
npm ci --legacy-peer-deps
npx prisma migrate deploy
npm run build
NODE_ENV=production npm start
```

---

## First-admin checklist

1. **/setup** or seed → Admin login  
2. **Settings** — timezone & labor rules  
3. **Team** — real staff IDs  
4. **Offline backup** — if this host should also dump JSON  

---

## Security

- Strong unique `AUTH_SECRET`  
- HTTPS in production  
- Change demo passwords  
- Only Admins edit org settings / create Admins  

Ship Windows `.exe` for offline shops → [RELEASE.md](RELEASE.md)
