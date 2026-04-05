# Dev Workflow

## Access

```bash
# Local (at home, fast)
ssh tricky@192.168.4.152
# or with SSH config alias:
ssh extserver

# Remote (anywhere, via Cloudflare tunnel)
ssh tricky@fuelright.app
# or with SSH config alias:
ssh fuelright
```

VS Code Remote SSH: connect to `extserver` or `fuelright` via Remote Explorer.

## Git branching

```
main    production — what runs at fuelright.app
dev     active development
```

Always develop on `dev`. Merge to `main` only when ready to deploy.

```bash
# Start work
git checkout dev
git pull origin dev

# Make changes, test locally
git add .
git commit -m "descriptive message"
git push origin dev

# Deploy to production
git checkout main
git merge dev
git push origin main
~/deploy.sh
```

## Running locally for development

```bash
# Terminal 1 — backend (nodemon, hot reload)
cd ~/fuelright/SparkyFitnessServer
pnpm start

# Terminal 2 — frontend (Vite, hot reload)
cd ~/fuelright/SparkyFitnessFrontend
pnpm dev
```

Access at http://192.168.4.152:5173 from Mac browser.
API calls from frontend go to http://192.168.4.152:3010.

For dev, set VITE_API_URL in SparkyFitnessFrontend/.env:
```
VITE_API_URL=http://192.168.4.152:3010
```

For production build, set to:
```
VITE_API_URL=https://fuelright.app
```

## Deploy script (~/deploy.sh)

```bash
#!/bin/bash
set -e
echo "Deploying FuelRight at $(date)"
cd ~/fuelright
git pull origin main
pnpm install
cd SparkyFitnessFrontend
VITE_API_URL=https://fuelright.app pnpm build:dev
cd ..
sudo systemctl restart fuelright
sudo nginx -s reload
echo "Deployed successfully at $(date)"
```

## Useful commands

```bash
# Check backend logs
sudo journalctl -u fuelright -f

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check Cloudflare tunnel
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f

# Check PostgreSQL
sudo systemctl status postgresql@16-main
sudo -u postgres psql fuelright_prod

# Restart everything
sudo systemctl restart fuelright
sudo nginx -s reload

# Check all services
sudo systemctl status fuelright postgresql@16-main nginx cloudflared
```

## Python environment (for ETL scripts)

```bash
# Activate
source ~/fuelright-scripts/bin/activate

# Run AFCD import
python3 ~/fuelright/scripts/seed_afcd.py

# Deactivate
deactivate
```

## Database access

```bash
# Connect to app database
psql -U fuelright -d fuelright_prod -h localhost

# Useful queries
\dt                          -- list tables
\d tablename                 -- describe table
SELECT count(*) FROM foods;  -- count foods
```

## Environment files

Two env files:
- ~/fuelright/.env — backend config (database URL, JWT secret, ports)
- ~/fuelright/SparkyFitnessFrontend/.env — frontend config (API URL)

Neither is committed to git (.gitignore covers both).
Back them up manually if the server is rebuilt.

## Node version

Managed by nvm. If node is not found after login:
```bash
source ~/.bashrc
nvm use default
```

The systemd service uses the full path to node to avoid this issue:
ExecStart=/home/tricky/.nvm/versions/node/v24.14.1/bin/node SparkyFitnessServer.js

If node is upgraded via nvm, update the systemd service path:
```bash
which node  # get new path
sudo nano /etc/systemd/system/fuelright.service  # update ExecStart
sudo systemctl daemon-reload
sudo systemctl restart fuelright
```

## Making changes to SparkyFitness

Prefer extending over modifying existing files where possible:
- New routes: add new file in routes/, register in SparkyFitnessServer.js
- New database tables: add migration file in db/migrations/
- New frontend pages: add in src/pages/, add route in router config
- Modified existing behaviour: comment clearly with // FUELRIGHT: explanation

This keeps upstream changes mergeable.

## Keeping up with SparkyFitness upstream

Your fork is trickydavo/SparkyFitness. Upstream is CodeWithCJ/SparkyFitness.

To pull upstream changes:
```bash
git remote add upstream git@github.com:CodeWithCJ/SparkyFitness.git
git fetch upstream
git checkout dev
git merge upstream/main
# Resolve conflicts if any, then test
```

Do this periodically — SparkyFitness is actively maintained (85+ releases).
