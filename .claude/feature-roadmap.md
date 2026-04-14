# Feature Roadmap

## What we're building

FuelRight = SparkyFitness base + Australian food data + deep micronutrient tracking +
body composition goals + food gap analysis + supplement flags.

Training/gym features are Phase 2 — do not start until Phase 1 is complete.

---

## Phase 1 — Australian Nutrition App (current focus)

### Sprint 1 — Infrastructure ✅ COMPLETE
- [x] Server setup (Ubuntu, Postgres, Nginx, Node)
- [x] Cloudflare tunnel (fuelright.app live)
- [x] Repo cloned, pnpm install done
- [x] SparkyFitness running at fuelright.app
- [x] Systemd service created (tsx, absolute nvm path)
- [x] Deploy script working (~/deploy.sh)

### Sprint 2 — Australian food database ✅ COMPLETE
- [x] AFCD ETL script (scripts/seed_afcd.py)
- [x] AFCD 1,588 foods seeded into database (provider_type='afcd')
- [x] afcd_nutrients table: all 268 nutrients per food (425,584 rows) — migration 20260405120000
- [x] Food schema uses provider_type + custom_nutrients JSONB (energy_kj, derivation, description)
- [x] Nutrient detail view (eye icon) on all foods in Food Database page
- [x] Copy & Edit for public/AFCD foods
- [ ] Open Food Facts AU bulk import (deferred — existing OFF integration sufficient)
- [ ] Search priority: AFCD first, OFF AU second, USDA fallback (deferred)
- [ ] Barcode scanner hitting au.openfoodfacts.org first (deferred)

### Sprint 3 — Micronutrient tracking ✅ COMPLETE
- [x] NRV targets defined for tricky and wife (age/sex specific)
- [x] Goals page extended: age + biological sex per user
- [x] Reports page: micronutrient panel showing tracked nutrients vs NRV
- [x] Coverage indicators (green ≥100%, amber 70–99%, red <70%) per nutrient
- [x] 7-day rolling average for each nutrient

### Sprint 4 — Gap analysis and food suggestions ✅ COMPLETE
- [x] 7-day persistent gap detection
- [x] Food suggestion query (top AFCD foods for deficient nutrient)
- [x] Eat more of these recommendation UI (expandable food sources per gap card)
- [x] Supplement flag logic (D, B12, omega-3, calcium age-adjusted)
- [ ] AFCD linking for non-AFCD foods (deferred)
  - Add `afcd_food_id` FK to `foods` table
  - When scanning/importing a simple ingredient (e.g. rolled oats, skim milk, chicken breast),
    suggest the closest AFCD match by name — user confirms or picks alternative
  - Branded/processed products: offer manual link UI, no auto-suggest
  - Micronutrient endpoint uses linked AFCD food's nutrients (scaled by serving) when available
  - Do NOT auto-link without user confirmation — wrong links are worse than no data
  - Priority: clear commodity ingredients first (produce, dairy, meat, grains)

### Sprint 5 — Body composition goals ✅ COMPLETE
- [x] TDEE calculator (Mifflin-St Jeor, evidence-based constants in bodyCompositionTargets.ts)
- [x] Goal mode selection (cut/maintain/bulk) with scientific rationale shown in UI
- [x] Calorie target from goal mode (TDEE ± evidence-based offset)
- [x] Protein target from goal mode (g/kg bodyweight, age-adjusted for >50)
- [x] Apply to Today's Goals button (saves immediately with cascade)
- [ ] Weekly weight-based recalculation (deferred — manual recalc via calculator is sufficient)
- [ ] Progress charts (weight trend vs target) (deferred to Phase 2)

### Sprint 6 — Polish and extras
- [ ] Meal templates for common AU meals
- [ ] Mobile PWA testing (Add to Home Screen on iPhone)
- [ ] Sparky chatbot context: include micronutrient gaps and goal mode in system prompt

### Future — FSANZ Branded Food Database (deferred — not yet available)
- Database is under development by Food Standards Australia New Zealand
- Will cover ~85% of packaged retail SKUs sold in AU
- Only NIP-level nutrients (energy, protein, fat, sat fat, carbs, sugars, sodium, fibre)
- No public download or API yet — brand-owner controlled, unclear licensing
- Monitor: https://www.foodstandards.gov.au/science-data/food-nutrient-databases/branded-food-database
- Revisit when public download is available — would be useful for barcode-to-brand matching

### Future — Open Food Facts AU bulk import (deferred)
- Full JSONL dump ~50GB, AU subset ~2-5GB, ODbL licence
- Would fix OFF search quality completely — local PostgreSQL search, no French results
- ~20-40k usable AU products after quality filtering (calories > 0)
- Only adds macro-level data, not micronutrients
- Revisit if OFF live API search quality remains a recurring pain point

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
