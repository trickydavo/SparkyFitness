# Feature Roadmap

## What we're building

FuelRight = SparkyFitness base + Australian food data + deep micronutrient tracking +
body composition goals + food gap analysis + supplement flags.

Training/gym features are Phase 2 — do not start until Phase 1 is complete.

---

## Phase 1 — Australian Nutrition App (current focus)

### Sprint 1 — Infrastructure (IN PROGRESS)
- [x] Server setup (Ubuntu, Postgres, Nginx, Node)
- [x] Cloudflare tunnel (fuelright.app live)
- [x] Repo cloned, pnpm install done
- [ ] SparkyFitness running at fuelright.app
- [ ] Systemd service created
- [ ] Deploy script working

### Sprint 2 — Australian food database
- [ ] AFCD ETL script (scripts/seed_afcd.py)
- [ ] AFCD 1,588 foods seeded into database
- [ ] Food schema extended (source, source_id, is_verified, afcd_classification)
- [ ] Open Food Facts AU bulk import
- [ ] Search priority: AFCD first, OFF AU second, USDA fallback
- [ ] Barcode scanner hitting au.openfoodfacts.org first

### Sprint 3 — Micronutrient tracking
- [ ] afcd_nutrients table created and seeded
- [ ] nrv_targets table seeded with Australian NRVs by age/sex
- [ ] User profile extended: age, sex fields
- [ ] Daily nutrient summary view (all 268 AFCD nutrients)
- [ ] Coverage bars against NRV (green/amber/red/grey)
- [ ] 7-day rolling average display

### Sprint 4 — Gap analysis and food suggestions
- [ ] 7-day persistent gap detection
- [ ] Food suggestion query (top AFCD foods for deficient nutrient)
- [ ] Eat more of these recommendation UI
- [ ] Supplement flag logic (D, B12, omega-3, calcium age-adjusted)

### Sprint 5 — Body composition goals
- [ ] TDEE calculator (Mifflin-St Jeor)
- [ ] Goal mode selection (cut/maintain/bulk)
- [ ] Calorie target from goal mode
- [ ] Protein target from goal mode
- [ ] Weekly weight-based recalculation
- [ ] Progress charts (weight trend vs target)

### Sprint 6 — Polish and access control
- [ ] Cloudflare Access policy (two email addresses)
- [ ] AFCD attribution in footer
- [ ] Meal templates for common AU meals
- [ ] Mobile PWA testing (Add to Home Screen on iPhone)
- [ ] Two-user experience (switch between tricky and wife profiles)

---

## Phase 2 — Training module (future)

Do not start until Phase 1 Sprint 6 is complete and stable.

### workout.cool integration
- workout.cool is MIT licensed, Next.js, has 800+ exercise database with videos
- Source: https://github.com/Snouzy/workout-cool
- Plan: import exercise database (CSV/SQL) and workout builder UI components

### Features
- Exercise logging (sets, reps, weight)
- RIR (Reps in Reserve) per set
- Mesocycle builder (MEV to MRV volume ramp, 4-6 week blocks)
- Deload scheduler (auto week 5-6)
- Volume landmark tracking per muscle group
- Strength progress charts
- Cardio logging (manual + Apple Health sync via Shortcuts workaround)

---

## What SparkyFitness already provides (do not rebuild)

- User authentication (better-auth)
- Multi-user support with family/shared access
- Meal logging (daily food diary)
- Macro tracking (protein, carbs, fat, calories)
- Food search and custom food entry
- Barcode scanner (existing - extend for AU sources)
- Body weight logging
- Basic progress charts
- Hydration tracking
- Goal setting
- USDA food database integration
- Open Food Facts integration (extend for AU priority)

---

## What we are replacing or modifying in SparkyFitness

| SparkyFitness default | FuelRight change |
|---|---|
| USDA food database priority | AFCD first, USDA as fallback |
| Global Open Food Facts | AU Open Food Facts first |
| Basic macro tracking only | Full 268-nutrient AFCD tracking |
| No NRV comparison | Australian NRV targets by age/sex |
| No gap analysis | 7-day gap detection + food suggestions |
| No supplement logic | Evidence-based supplement flags |
| Generic calorie goals | TDEE + goal-mode calorie/protein targets |
| No Australian food data | AFCD 1,588 AU foods seeded |

---

## Design principles

- Do not overbuild — personal app for 2 users, not a SaaS product
- Food first — supplements are a last resort, not a first recommendation
- Australian context — AFCD data, NRV targets, AU food products
- Honest — show the data, do not hide gaps, do not oversell precision
- Simple UI — extend SparkyFitness UI patterns, do not redesign
- Modify minimally — prefer extending over replacing SparkyFitness code
- Keep upstream changes accessible — do not diverge so far that SparkyFitness updates cannot be merged

---

## Licence compliance

SparkyFitness: custom non-commercial licence (codewithcj)
- Personal use: permitted
- Modification: permitted
- Private hosting: permitted
- Commercial use: not permitted without written permission
- Derivative works: must use same non-commercial terms

FuelRight is a private personal project — fully compliant.
Keep the LICENSE file in the repo unchanged.

workout.cool is MIT licensed — no restrictions.
AFCD data is CC BY 4.0 — attribution required (see food-data.md).
Open Food Facts data is CC BY-SA 4.0 — attribution required.
