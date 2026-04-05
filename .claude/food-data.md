# Food Data

## Data sources — priority order

When a user searches for food or scans a barcode, sources are checked in this order:

1. **AFCD** — Australian Food Composition Database (whole foods, raw ingredients, AU-specific)
2. **Open Food Facts AU** — Packaged/branded goods with barcodes, AU-contributed products
3. **User custom** — Foods the user has entered manually
4. **Open Food Facts global** — International packaged products
5. **USDA** — Fallback for anything not in AU sources

## AFCD Release 3

| | |
|---|---|
| Publisher | Food Standards Australia New Zealand (FSANZ) |
| Version | Release 3, December 2025 |
| Foods | 1,588 |
| Nutrients per food | Up to 268 |
| License | Creative Commons Attribution 4.0 (free to use with attribution) |
| Files | ~/fuelright/data/afcd/ (copied manually, not in git) |

### Files
- AFCD_Release_3_-_Food_Details.xlsx — food names, descriptions, classifications
- AFCD_Release_3_-_Nutrient_profiles.xlsx — all nutrient values per 100g
- AFCD_Release_3_-_Food_group_information.xlsx — food group hierarchy
- AFCD_Release_3_-_Nutrient_details.xlsx — nutrient names, units, equations
- AFCD_Release_3_-_Recipes.xlsx — cooked food recipe calculations
- AFCD_Release_3_-_Reference_List.xlsx — source citations

### Key identifiers
- Public Food Key: e.g. F002963 (primary key)
- Classification: 5-digit code mapping to food group hierarchy
- Derivation: Analysed | Recipe | Borrowed | Imputed | Label data

### Data quality tiers
- Analysed (1,046 foods) — lab-measured → is_verified = TRUE
- Recipe (417 foods) — calculated from ingredients → is_verified = FALSE
- Borrowed (78 foods) — from overseas DB → is_verified = FALSE
- Imputed/Label (~47 foods) — estimated → is_verified = FALSE

### File structure gotcha
The xlsx files have a non-standard header structure:
- Row 0: Sheet title (e.g. "Release 3 - Nutrient profiles (per 100 g)")
- Row 1: Blank
- Row 2: Actual column headers

Read with pandas: `pd.read_excel(file, header=2)` then skip row 0 (which contains the actual headers as data).

## AFCD ETL script

Location: ~/fuelright/scripts/seed_afcd.py

```python
# Run with the project's Python venv
source ~/fuelright-scripts/bin/activate
python3 ~/fuelright/scripts/seed_afcd.py
```

The script:
1. Reads Food_Details.xlsx — food names, classifications, derivation
2. Reads Nutrient_profiles.xlsx — all 268 nutrient values per food
3. Merges on Public Food Key
4. Inserts/upserts into foods table with source='afcd'
5. Inserts micronutrient detail into afcd_nutrients table
6. Sets is_verified=TRUE for Analysed derivation foods

## Open Food Facts AU

### Barcode scanning (live API)
```
Primary:  https://world.openfoodfacts.org/api/v0/product/{barcode}.json
          with ?fields=product_name,brands,nutriments,serving_size
Filter:   Check countries_tags contains 'en:australia' for AU products
Fallback: Global OFF API for non-AU products
```

### Bulk import (monthly)
Download AU-filtered products:
```bash
# Filter to AU-contributed products only (~300MB compressed)
wget https://au.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
```

Key OFF CSV columns:
| App field | OFF column |
|---|---|
| source_id | code (barcode) |
| name | product_name |
| brand | brands |
| energy_kj | energy-kj_100g |
| energy_kcal | energy-kcal_100g |
| protein_g | proteins_100g |
| fat_total_g | fat_100g |
| carbs_g | carbohydrates_100g |
| sugars_g | sugars_100g |
| fibre_g | fiber_100g |
| sodium_mg | sodium_100g × 1000 (OFF is g, we store mg) |
| serving_size_g | serving_size (needs parsing) |

### Barcode scan lookup flow
```
1. Query local DB: SELECT * FROM foods WHERE source IN ('off_au','off_global') AND source_id = barcode
2. If miss: GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json
3. If found: save to local DB for future cache hit
4. If miss: Query USDA branded foods API
5. If all miss: Prompt manual entry
```

## Food search priority SQL

```sql
SELECT *,
  CASE source
    WHEN 'afcd'       THEN 1
    WHEN 'off_au'     THEN 2
    WHEN 'custom'     THEN 3
    WHEN 'off_global' THEN 4
    WHEN 'usda'       THEN 5
  END AS source_rank,
  ts_rank(to_tsvector('english', name), plainto_tsquery('english', $1)) AS text_rank
FROM foods
WHERE to_tsvector('english', name) @@ plainto_tsquery('english', $1)
ORDER BY source_rank ASC, text_rank DESC
LIMIT 20;
```

## AFCD attribution requirement

Under CC BY 4.0, include this attribution wherever AFCD data is displayed:

"Nutrient data sourced from the Australian Food Composition Database, Release 3 (December 2025),
Food Standards Australia New Zealand. https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd"

Add to app footer and any data export files.
