<p align="center">
  <img src="../public/logo.svg" alt="ShiftGrid" width="64" height="64" />
</p>

<h1 align="center">User guide</h1>

<p align="center">
  <img alt="roles" src="https://img.shields.io/badge/roles-Admin%20·%20Manager%20·%20Staff-1F6F5B" />
  <img alt="modes" src="https://img.shields.io/badge/modes-Web%20%2B%20Desktop-C48C3C" />
</p>

<p align="center"><a href="GETTING_STARTED.md">← Choose Web or Windows first</a></p>

---

## Sign in

| Path | What to do |
|------|------------|
| Fresh install | Open **/setup** → org + first Admin |
| Demo seed | `admin@demo.local` / `password123` |
| New staff | Temporary password → forced change on first login |
| Lockout | Too many failed attempts → wait ~15 minutes |

---

## Schedule

| Control | Action |
|---------|--------|
| **Agenda** | Phone-friendly day list |
| **Week** | Drag-and-drop org grid |
| **Month** | Coverage overview |
| **Copy → next week** | Managers duplicate the week |
| Coverage banner | Understaffed / unassigned days |

Staff: open a shift → **clock in/out** or **offer swap**.

---

## Swaps

```
Offer → Accept / Claim → (rules check) → Manager Approve / Deny
```

Rules checked: overlap · weekly OT · max hours/day · minimum break.

---

## Timesheet

Scheduled vs actual hours for the week.  
Managers see the organization; staff see themselves.

---

## Team · Profile · Settings

| Area | Who | What |
|------|-----|------|
| **Team** | Admin / Manager | Create login IDs, roles, deactivate |
| **Profile** | Everyone | Name, contact, password |
| **Settings** | **Admin only** | Timezone, OT, breaks, coverage, location clock-in |
| **Offline backup** | **Admin** | Nightly JSON → local + OneDrive/Drive folder |
| **Audit** | Admin / Manager | Recent actions |

---

## Inbox

In-app messages for schedule & swap events.  
Optional Web Push; emails queue to `EmailOutbox` when configured.

---

## Prefer offline Windows?

Install / run the desktop app and point the night backup at a sync folder.  
→ [WINDOWS_DESKTOP.md](WINDOWS_DESKTOP.md)
