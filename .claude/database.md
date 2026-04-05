# Database

## PostgreSQL setup

| | |
|---|---|
| Version | PostgreSQL 16 |
| Data directory | /mnt/data/postgres/postgresql/16/main |
| Config file | /etc/postgresql/16/main/postgresql.conf |
| Service | postgresql@16-main |
| Database | fuelright_prod |
| User | fuelright |
| Host | localhost |
| Port | 5432 |

## Performance config (32GB RAM server)

```ini
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 128MB
maintenance_work_mem = 2GB
max_connections = 50
wal_buffers = 16MB
checkpoint_completion_target = 0.9
log_min_duration_statement = 1000
```

## Connection string

```
postgresql://fuelright:PASSWORD@localhost:5432/fuelright_prod
```

## SparkyFitness schema notes

SparkyFitness uses its own migration system. On first start it likely auto-creates tables.
Check ~/fuelright/SparkyFitnessServer/db/ for migration files and pool manager.
The db_schema_backup.sql at repo root is a reference copy of the full schema.

## FuelRight schema extensions

These tables extend SparkyFitness for Australian food data and micronutrient tracking.
Add these via migration files in SparkyFitnessServer/db/migrations/.

### food_source enum
```sql
CREATE TYPE food_source AS ENUM (
  'afcd',       -- Australian Food Composition Database
  'off_au',     -- Open Food Facts (AU region)
  'off_global', -- Open Food Facts (global)
  'usda',       -- USDA FoodData Central
  'custom'      -- User-entered
);
```

### food_items extensions
SparkyFitness has an existing food table. Extend it with:
```sql
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source food_source DEFAULT 'custom';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS afcd_classification TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS energy_kj NUMERIC(8,2);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS fibre_g NUMERIC(8,3);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS alcohol_g NUMERIC(8,3);

CREATE INDEX IF NOT EXISTS idx_foods_source_id ON foods(source, source_id);
```

### afcd_nutrients table (micronutrient detail)
```sql
CREATE TABLE IF NOT EXISTS afcd_nutrients (
  food_id       INTEGER REFERENCES foods(id) ON DELETE CASCADE,
  nutrient_name TEXT NOT NULL,
  nutrient_unit TEXT,
  value         NUMERIC(12,4),
  PRIMARY KEY (food_id, nutrient_name)
);
```

### nrv_targets table (Australian NRVs)
```sql
CREATE TABLE IF NOT EXISTS nrv_targets (
  id            SERIAL PRIMARY KEY,
  nutrient_name TEXT NOT NULL,
  sex           TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  age_min       INTEGER NOT NULL,
  age_max       INTEGER,
  rdi           NUMERIC(10,3),   -- Recommended Dietary Intake
  ear           NUMERIC(10,3),   -- Estimated Average Requirement
  ai            NUMERIC(10,3),   -- Adequate Intake (where RDI not set)
  ul            NUMERIC(10,3),   -- Upper Level (toxicity ceiling)
  unit          TEXT NOT NULL,
  notes         TEXT,
  UNIQUE (nutrient_name, sex, age_min)
);
```

### supplement_flags view
```sql
CREATE OR REPLACE VIEW user_supplement_flags AS
SELECT
  u.id as user_id,
  u.name,
  n.nutrient_name,
  AVG(nd.value) as avg_7day,
  t.rdi,
  t.unit,
  ROUND((AVG(nd.value) / t.rdi) * 100, 1) as pct_rdi,
  CASE
    WHEN n.nutrient_name IN ('Vitamin D', 'Cobalamin (B12)', 'Omega-3')
      AND AVG(nd.value) < t.ear THEN 'supplement_recommended'
    WHEN AVG(nd.value) < t.ear THEN 'food_gap'
    WHEN AVG(nd.value) >= t.rdi THEN 'met'
    ELSE 'approaching'
  END as status
FROM users u
-- join to daily logs, nutrient data, NRV targets
-- full query in scripts/views/supplement_flags.sql
;
```

## AFCD nutrient column mapping

Key columns from AFCD Nutrient_profiles.xlsx (per 100g):

| App field | AFCD column | Unit |
|---|---|---|
| energy_kj | Energy with dietary fibre, equated (kJ) | kJ |
| protein_g | Protein (g) | g |
| fat_total_g | Fat, total (g) | g |
| carbs_g | Available carbohydrate, without sugar alcohols (g) | g |
| sugars_g | Total sugars (g) | g |
| fibre_g | Total dietary fibre (g) | g |
| sodium_mg | Sodium (Na) (mg) | mg |
| alcohol_g | Alcohol (g) | g |
| calcium_mg | Calcium (Ca) (mg) | mg |
| iron_mg | Iron (Fe) (mg) | mg |
| magnesium_mg | Magnesium (Mg) (mg) | mg |
| zinc_mg | Zinc (Zn) (mg) | mg |
| potassium_mg | Potassium (K) (mg) | mg |
| iodine_ug | Iodine (I) (ug) | ug |
| selenium_ug | Selenium (Se) (ug) | ug |
| vitamin_a_ug | Vitamin A retinol equivalents (ug) | ug |
| thiamin_mg | Thiamin (B1) (mg) | mg |
| riboflavin_mg | Riboflavin (B2) (mg) | mg |
| niacin_mg | Niacin derived equivalents (mg) | mg |
| b6_mg | Pyridoxine (B6) (mg) | mg |
| b12_ug | Cobalamin (B12) (ug) | ug |
| folate_ug | Dietary folate equivalents (ug) | ug |
| vitamin_c_mg | Vitamin C (mg) | mg |
| vitamin_d_ug | Vitamin D3 equivalents (ug) | ug |
| vitamin_e_mg | Vitamin E (mg) | mg |
| omega3_mg | Total long chain omega 3 fatty acids, equated (mg) | mg |
| sat_fat_g | Total saturated fatty acids, equated (g) | g |

Note: AFCD energy is kJ only. Convert to kcal: kcal = kJ / 4.184
Note: AFCD sodium is already mg/100g. Open Food Facts reports g/100g — multiply by 1000 on import.
