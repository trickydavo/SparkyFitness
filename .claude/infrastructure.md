# Infrastructure

## Server

| | |
|---|---|
| Hardware | Intel mini PC, 32GB RAM, NVMe boot drive (914GB), dedicated NVMe for Postgres (466GB), storage drive (458GB) |
| OS | Ubuntu Server 24.04 LTS (Noble) |
| Hostname | extserver |
| IP | 192.168.4.152 |
| User | tricky |
| SSH | Key auth only, password login disabled |

## Services and ports

| Service | Port | Notes |
|---|---|---|
| Nginx | 8080 | Cloudflare tunnel points here |
| Node.js backend | 3010 | Nginx proxies /api/* here |
| PostgreSQL | 5432 | Local only, not exposed externally |
| cloudflared | — | Outbound tunnel to Cloudflare edge |
| Vite dev server | 5173 | Dev only, not exposed externally |

## Storage layout

```
/                           → nvme1n1 (OS drive, 914GB, ubuntu--vg-ubuntu--lv)
/mnt/data/postgres          → nvme0n1 (dedicated Postgres NVMe, 466GB, vg_data-lv_postgres, XFS)
/mnt/stuff                  → sda (general storage, 458GB, vg_stuff-lv_stuff)
```

PostgreSQL data directory: `/mnt/data/postgres/postgresql/16/main`

## Firewall (UFW)

```
22/tcp          ALLOW IN    192.168.1.0/24   (Mac's VLAN)
22/tcp          ALLOW IN    192.168.4.0/24   (server's own VLAN)
Nginx Full      ALLOW IN    Anywhere
8080/tcp        ALLOW IN    Anywhere
Default:        DENY incoming, ALLOW outgoing
```

## Cloudflare setup

- Domain: fuelright.app
- Nameservers: brady.ns.cloudflare.com, lorna.ns.cloudflare.com
- Tunnel name: fuelright
- DNS record: fuelright.app → tunnel (CNAME, Proxied)
- Public hostname: fuelright.app → http://localhost:8080
- SSH hostname: ssh.fuelright.app → ssh://localhost:22 (to be configured)
- Access policy: NOT YET CONFIGURED (open during development, add before sharing)

## Installed software

| Software | Version | Install method |
|---|---|---|
| Node.js | v24.14.1 | nvm |
| npm | 10.x | bundled with node |
| pnpm | 10.32.1 | npm install -g pnpm |
| PostgreSQL | 16 | apt |
| Nginx | — | apt |
| Git | — | apt |
| Python 3 | 3.12.x | system |
| cloudflared | — | Cloudflare apt repo |
| fail2ban | — | apt |

## Phase 6 — completing SparkyFitness install

### What's done
- Repo cloned to ~/fuelright from git@github.com:trickydavo/SparkyFitness.git
- pnpm install completed successfully (2490 packages)
- .env file at ~/fuelright/.env (root level — backend loads from ../ relative to SparkyFitnessServer)
- Nginx config at /etc/nginx/sites-available/fuelright (active, default removed)
- PostgreSQL database: fuelright_prod, user: fuelright

### Still to do

**1. Check database schema init**
SparkyFitness may auto-migrate on first start. Check:
```bash
ls ~/fuelright/SparkyFitnessServer/db/
cat ~/fuelright/db_schema_backup.sql | head -100
```

**2. Start backend and test**
```bash
cd ~/fuelright/SparkyFitnessServer
pnpm start
```
Watch for database connection errors. If it connects and starts, the schema likely auto-runs.

**3. Build frontend**
```bash
cd ~/fuelright/SparkyFitnessFrontend
pnpm build:dev
```
`build:dev` skips typecheck/lint — use this for production builds until codebase is clean.

**4. Create systemd service**
```bash
sudo nano /etc/systemd/system/fuelright.service
```

Content:
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
EnvironmentFile=/home/tricky/fuelright/.env
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable fuelright
sudo systemctl start fuelright
sudo systemctl status fuelright
```

**5. Fix permissions if Nginx 403s**
```bash
sudo chmod o+x /home/tricky
sudo chown -R tricky:www-data ~/fuelright
sudo chmod -R 750 ~/fuelright
sudo nginx -s reload
```

**6. Test end to end**
Visit https://fuelright.app — should see SparkyFitness login screen.

## Deploy script

Create ~/deploy.sh:
```bash
#!/bin/bash
set -e
echo "Deploying FuelRight at $(date)"
cd ~/fuelright
git pull origin main
pnpm install
cd SparkyFitnessFrontend && pnpm build:dev && cd ..
sudo systemctl restart fuelright
sudo nginx -s reload
echo "Done"
```

```bash
chmod +x ~/deploy.sh
```
