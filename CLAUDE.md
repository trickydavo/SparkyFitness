# FuelRight — Claude Code Project Guide

This file is the primary context document for Claude Code. Read it fully before making any changes.
Additional detail files are in the `.claude/` directory — read the relevant one before working on that area.

---

## What this project is

FuelRight is a fork of SparkyFitness, modified to be an Australian-first nutrition, body composition,
and fitness tracking app for two users (owner and partner). It is self-hosted on a dedicated server
and accessed via Cloudflare Tunnel at https://fuelright.app.

The core philosophy: **food first, supplements only where diet genuinely can't cover the gap.**

---

## The two users

- **tricky** — owner, male, NSW Australia
- **wife** — partner, female, NSW Australia

Both users are tracked independently with their own profiles, goals, and NRV targets.
Multi-user support is already built into SparkyFitness.

---

## Infrastructure

| Component | Detail |
|---|---|
| Server | Intel mini PC, Ubuntu Server 24.04 LTS, hostname `extserver` |
| Server IP | 192.168.4.152 (VLAN 4, isolated from main LAN) |
| Domain | fuelright.app (Cloudflare, full DNS setup) |
| Tunnel | Cloudflare Tunnel → cloudflared systemd service → Nginx on port 8080 |
| Database | PostgreSQL 16, data on dedicated NVMe at /mnt/data/postgres/postgresql/16/main |
| Runtime | Node.js v24 via nvm |
| Package manager | pnpm (workspace) |
| Web server | Nginx — serves frontend static files, proxies /api/* to Node on port 3010 |
| Dev access | VS Code Remote SSH → ssh tricky@192.168.4.152 |
| Remote access | ssh tricky@fuelright.app (via Cloudflare tunnel) |

---

## Repository structure

```
fuelright/                          ← git root, cloned from trickydavo/SparkyFitness
├── .env                            ← environment config (root level, never commit)
├── .claude/                        ← Claude Code context files
│   ├── infrastructure.md           ← server setup, services, deployment
│   ├── database.md                 ← schema, migrations, PostgreSQL config
│   ├── food-data.md                ← AFCD, Open Food Facts AU, food search priority
│   ├── nutrition-science.md        ← NRV targets, supplement logic, science references
│   ├── feature-roadmap.md          ← what's built, what's next, sprint plan
│   └── dev-workflow.md             ← git branching, deploy process, testing
├── SparkyFitnessServer/            ← Node.js/Express backend
│   ├── SparkyFitnessServer.js      ← entry point
│   ├── db/                         ← database connection, pool manager
│   ├── routes/                     ← API route handlers
│   ├── models/                     ← data access layer
│   ├── middleware/                 ← auth, logging, validation
│   └── ...
├── SparkyFitnessFrontend/          ← React/Vite frontend
│   ├── .env                        ← VITE_API_URL=https://fuelright.app
│   ├── src/
│   └── ...
├── SparkyFitnessMobile/            ← React Native mobile (future)
├── shared/                         ← shared types and utilities
├── data/
│   └── afcd/                       ← AFCD Release 3 xlsx files (not committed, copied manually)
└── scripts/
    └── seed_afcd.py                ← AFCD ETL import script
```

---

## Environment file (.env at repo root)

```env
# Database
DATABASE_URL=postgresql://fuelright:PASSWORD@localhost:5432/fuelright_prod
PGUSER=fuelright
PGPASSWORD=PASSWORD
PGDATABASE=fuelright_prod
PGHOST=localhost
PGPORT=5432

# Server
PORT=3010
NODE_ENV=production

# Auth
JWT_SECRET=GENERATED_SECRET

# App
APP_URL=https://fuelright.app
```

The backend loads this from `../` relative to SparkyFitnessServer (i.e., the repo root).

---

## Running the app

### Development mode
```bash
# Terminal 1 — backend (hot reload via nodemon)
cd ~/fuelright/SparkyFitnessServer
pnpm start

# Terminal 2 — frontend (Vite dev server on port 5173)
cd ~/fuelright/SparkyFitnessFrontend
pnpm dev
```

Access at http://192.168.4.152:5173 from your Mac browser during development.

### Production build and start
```bash
# Build frontend (skips validation checks)
cd ~/fuelright/SparkyFitnessFrontend
pnpm build:dev

# Restart backend systemd service
sudo systemctl restart fuelright

# Nginx serves the built frontend and proxies API
# Access at https://fuelright.app
```

### Deploy script (~/deploy.sh)
```bash
#!/bin/bash
set -e
cd ~/fuelright
git pull origin main
pnpm install
cd SparkyFitnessFrontend && pnpm build:dev && cd ..
sudo systemctl restart fuelright
echo "Deployed at $(date)"
```

---

## Git workflow

```
main    → production branch, what runs at fuelright.app
dev     → active development branch
```

Day-to-day:
```bash
git checkout dev
# make changes, test locally
git add . && git commit -m "description"
git push origin dev

# When ready to deploy:
git checkout main && git merge dev
git push origin main
~/deploy.sh
```

---

## Systemd service (fuelright)

Located at `/etc/systemd/system/fuelright.service` — to be created in Phase 6.

```ini
[Unit]
Description=FuelRight Backend
After=network.target postgresql.service

[Service]
Type=simple
User=tricky
WorkingDirectory=/home/tricky/fuelright/SparkyFitnessServer
ExecStart=/home/tricky/.nvm/versions/node/v24.14.1/bin/node SparkyFitnessServer.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## Nginx config

Located at `/etc/nginx/sites-available/fuelright`:

```nginx
server {
    listen 8080;
    server_name fuelright.app extserver.local;

    root /home/tricky/fuelright/SparkyFitnessFrontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

---

## Current status

- [x] Phase 1 — Ubuntu Server 24.04 LTS installed
- [x] Phase 2 — VLAN configured, server on 192.168.4.x
- [x] Phase 3 — Server hardened: UFW, fail2ban, SSH keys, Node, PostgreSQL, Nginx, cloudflared
- [x] Phase 4 — Cloudflare tunnel live, fuelright.app resolving
- [x] Phase 5 — VS Code Remote SSH working
- [ ] Phase 6 — SparkyFitness running at fuelright.app (IN PROGRESS)
- [ ] Phase 7 — Dev workflow, systemd service, deploy script
- [ ] Phase 8 — AFCD data import
- [ ] Phase 9 — FuelRight feature development

---

## Immediate next task (Phase 6 — in progress)

The repo is cloned to ~/fuelright. pnpm install has run successfully.
The .env file is at ~/fuelright/.env (root level).

**Still to do:**
1. Check database initialisation — SparkyFitness likely auto-migrates on first start
2. Start backend and confirm it connects to PostgreSQL
3. Build frontend with `pnpm build:dev`
4. Create systemd service
5. Confirm app loads at https://fuelright.app

See `.claude/infrastructure.md` for full detail.
