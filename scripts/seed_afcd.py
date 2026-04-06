#!/usr/bin/env python3
"""
AFCD Release 3 ETL — seeds the fuelright_prod database with Australian Food
Composition Database data.

Imports:
  - foods table: name, provider_type='afcd', shared_with_public=TRUE
  - food_variants table: common macros (calories, protein, fat, carbs, etc.) per 100g
  - afcd_nutrients table: ALL 268 AFCD nutrients per food as EAV rows

Run with:
    source ~/fuelright-scripts/bin/activate
    python3 ~/fuelright/scripts/seed_afcd.py

Requires the AFCD xlsx files at ~/fuelright/data/afcd/.
"""

import os
import re
import sys
import psycopg2
import psycopg2.extras
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

AFCD_DIR = Path.home() / 'fuelright' / 'data' / 'afcd'
ENV_FILE = Path.home() / 'fuelright' / '.env'

FOOD_DETAILS_FILE     = AFCD_DIR / 'AFCD Release 3 - Food Details.xlsx'
NUTRIENT_PROFILE_FILE = AFCD_DIR / 'AFCD Release 3 - Nutrient profiles.xlsx'

PROVIDER_TYPE_ID = 'afcd'
PROVIDER_DISPLAY = 'AFCD (Australian Food Composition Database)'

# Identifier columns in the Nutrient Profiles sheet (not nutrients)
IDENTIFIER_COLS = {'Public Food Key', 'Classification', 'Derivation', 'Food Name'}

# Nutrient column → food_variants DB column mapping.
# These common macros are stored in food_variants for diary calculations.
# ALL nutrients (including these) are also stored in afcd_nutrients.
FOOD_VARIANT_MAP = {
    'Energy with dietary fibre, equated \n(kJ)':             'energy_kj',       # → custom_nutrients
    'Protein \n(g)':                                          'protein',
    'Fat, total \n(g)':                                       'fat',
    'Available carbohydrate, without sugar alcohols \n(g)':  'carbs',
    'Total sugars (g)':                                       'sugars',
    'Total dietary fibre \n(g)':                              'dietary_fiber',
    'Sodium (Na) \n(mg)':                                     'sodium',
    'Potassium (K) \n(mg)':                                   'potassium',
    'Calcium (Ca) \n(mg)':                                    'calcium',
    'Iron (Fe) \n(mg)':                                       'iron',
    'Vitamin C \n(mg)':                                       'vitamin_c',
    'Vitamin A retinol equivalents \n(ug)':                   'vitamin_a',
    'Cholesterol \n(mg)':                                     'cholesterol',
    'Total saturated fatty acids, equated \n(g)':             'saturated_fat',
    'Total monounsaturated fatty acids, equated \n(g)':       'monounsaturated_fat',
    'Total polyunsaturated fatty acids, equated \n(g)':       'polyunsaturated_fat',
    'Total trans fatty acids, imputed \n(mg)':                'trans_fat',       # mg → g conversion needed
}

# kJ to kcal conversion
KJ_TO_KCAL = 0.239006


# ---------------------------------------------------------------------------
# Nutrient key normalisation
# ---------------------------------------------------------------------------

def extract_unit(col_name: str) -> str:
    """Extract unit string from the trailing parenthesis, e.g. '(mg)' → 'mg'."""
    m = re.search(r'\(([^)]+)\)\s*$', col_name.strip())
    return m.group(1).strip() if m else ''


def normalize_nutrient_key(col_name: str) -> str:
    """
    Convert an AFCD column name to a stable snake_case key.

    Examples:
      'Calcium (Ca) \\n(mg)'                            → 'calcium_mg'
      'Total saturated fatty acids, equated \\n(g)'     → 'total_saturated_fatty_acids_equated_g'
      'C20:5w3 (mg)'                                    → 'c20_5w3_mg'
      'Alpha tocopherol \\n(mg)'                        → 'alpha_tocopherol_mg'
    """
    s = col_name.replace('\n', ' ').strip()

    # Extract unit from trailing parenthesis
    unit = extract_unit(s)
    # Remove trailing unit parenthesis
    s = re.sub(r'\s*\([^)]+\)\s*$', '', s).strip()
    # Remove element symbols like "(Ca)", "(Fe)", "(Na)" in the middle
    s = re.sub(r'\s*\([A-Z][a-z]?\)\s*', ' ', s).strip()

    # Lowercase
    s = s.lower()
    # Replace colons (fatty acid notation like 20:5) with underscore
    s = s.replace(':', '_')
    # Replace any run of non-alphanumeric chars with a single underscore
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')

    # Append unit (clean it up)
    unit_clean = re.sub(r'[^a-z0-9%t]+', '', unit.lower())
    # '%T' in AFCD means percent of total fatty acids — keep as 'pct'
    unit_clean = unit_clean.replace('%t', 'pct').replace('%', 'pct')
    if unit_clean:
        s = f"{s}_{unit_clean}"

    return s


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_env():
    if not ENV_FILE.exists():
        print(f"ERROR: .env not found at {ENV_FILE}", file=sys.stderr)
        sys.exit(1)
    load_dotenv(ENV_FILE)


def get_db_conn():
    return psycopg2.connect(
        host=os.environ['SPARKY_FITNESS_DB_HOST'],
        port=os.environ.get('SPARKY_FITNESS_DB_PORT', 5432),
        dbname=os.environ['SPARKY_FITNESS_DB_NAME'],
        user=os.environ['SPARKY_FITNESS_DB_USER'],
        password=os.environ['SPARKY_FITNESS_DB_PASSWORD'],
    )


def safe_float(val, divisor=1):
    """Return float or None for NaN/None (None = not measured)."""
    try:
        f = float(val)
        if pd.isna(f):
            return None
        return round(f / divisor, 6)
    except (TypeError, ValueError):
        return None


def kj_to_kcal(kj):
    v = safe_float(kj)
    if v is None:
        return 0.0
    return round(v * KJ_TO_KCAL, 2)


# ---------------------------------------------------------------------------
# Load AFCD files
# ---------------------------------------------------------------------------

def load_food_details():
    print("Loading Food Details...")
    df = pd.read_excel(FOOD_DETAILS_FILE, sheet_name='Food details', header=2)
    df.columns = [c.strip() for c in df.columns]
    df = df[['Public Food Key', 'Food Name', 'Food Description', 'Derivation']].dropna(subset=['Public Food Key'])
    df = df[df['Public Food Key'].astype(str).str.match(r'^F\d+$')]
    print(f"  {len(df)} foods loaded from Food Details")
    return df.set_index('Public Food Key')


def load_nutrient_profiles():
    print("Loading Nutrient Profiles...")
    df = pd.read_excel(NUTRIENT_PROFILE_FILE, sheet_name=1, header=2)
    df.columns = [c.strip() for c in df.columns]
    df = df.dropna(subset=['Public Food Key'])
    df = df[df['Public Food Key'].astype(str).str.match(r'^F\d+$')]
    print(f"  {len(df)} foods loaded from Nutrient Profiles")
    # Identify nutrient columns (everything except identifier cols)
    nutrient_cols = [c for c in df.columns if c not in IDENTIFIER_COLS]
    print(f"  {len(nutrient_cols)} nutrient columns found")
    return df.set_index('Public Food Key'), nutrient_cols


# ---------------------------------------------------------------------------
# Build nutrient key map (column name → (key, unit, label))
# ---------------------------------------------------------------------------

def build_nutrient_key_map(nutrient_cols):
    """
    Returns dict: col_name → (key, unit, label)
    Handles duplicate keys by appending _2, _3 etc.
    """
    key_map = {}
    seen_keys = {}
    for col in nutrient_cols:
        key = normalize_nutrient_key(col)
        unit = extract_unit(col.replace('\n', ' ').strip())
        label = col.replace('\n', ' ').strip()

        if key in seen_keys:
            seen_keys[key] += 1
            key = f"{key}_{seen_keys[key]}"
        else:
            seen_keys[key] = 1

        key_map[col] = (key, unit, label)
    return key_map


# ---------------------------------------------------------------------------
# Database operations
# ---------------------------------------------------------------------------

def ensure_provider_type(cur):
    cur.execute("""
        INSERT INTO public.external_provider_types (id, display_name, description, is_strictly_private)
        VALUES (%s, %s, %s, FALSE)
        ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    """, (PROVIDER_TYPE_ID, PROVIDER_DISPLAY,
          'Australian Food Composition Database Release 3, FSANZ (CC BY 4.0)'))
    print(f"  Provider type '{PROVIDER_TYPE_ID}' ensured.")


def upsert_food(cur, public_food_key, food_name, food_description, derivation, row, nutrient_cols, key_map):
    """
    Upsert into foods + food_variants + afcd_nutrients.
    Returns food_id.
    All AFCD foods are public (user_id = NULL, shared_with_public = TRUE).
    """
    is_verified = derivation == 'Analysed'

    # ---- foods upsert ----
    cur.execute("""
        SELECT id FROM public.foods
        WHERE provider_external_id = %s AND provider_type = %s
    """, (public_food_key, PROVIDER_TYPE_ID))
    existing = cur.fetchone()

    if existing:
        food_id = existing[0]
        cur.execute("UPDATE public.foods SET name = %s, updated_at = now() WHERE id = %s",
                    (food_name, food_id))
    else:
        cur.execute("""
            INSERT INTO public.foods
                (id, user_id, name, brand, provider_type, provider_external_id,
                 is_custom, shared_with_public)
            VALUES
                (gen_random_uuid(), NULL, %s, NULL, %s, %s, FALSE, TRUE)
            RETURNING id
        """, (food_name, PROVIDER_TYPE_ID, public_food_key))
        food_id = cur.fetchone()[0]

    # ---- food_variants upsert (common macros) ----
    energy_kj_val = safe_float(row.get('Energy with dietary fibre, equated \n(kJ)'))
    calories = kj_to_kcal(energy_kj_val)

    # trans_fat in AFCD is in mg — convert to g for food_variants
    trans_fat_mg = safe_float(row.get('Total trans fatty acids, imputed \n(mg)'))
    trans_fat_g = round(trans_fat_mg / 1000, 6) if trans_fat_mg is not None else 0.0

    def fv(col):
        v = safe_float(row.get(col))
        return v if v is not None else 0.0

    custom_nutrients = {
        'energy_kj': energy_kj_val or 0.0,
        'is_verified': is_verified,
        'afcd_derivation': derivation,
    }
    if food_description and not pd.isna(food_description):
        custom_nutrients['description'] = str(food_description)

    cur.execute("""
        INSERT INTO public.food_variants
            (id, food_id, serving_size, serving_unit, is_default,
             calories, protein, fat, carbs, sugars, dietary_fiber,
             sodium, potassium, calcium, iron, vitamin_c, vitamin_a,
             cholesterol, saturated_fat, monounsaturated_fat, polyunsaturated_fat,
             trans_fat, custom_nutrients)
        SELECT
            gen_random_uuid(), %s, 100, 'g', TRUE,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s
        WHERE NOT EXISTS (
            SELECT 1 FROM public.food_variants WHERE food_id = %s AND is_default = TRUE
        )
    """, (
        food_id,
        calories,
        fv('Protein \n(g)'),
        fv('Fat, total \n(g)'),
        fv('Available carbohydrate, without sugar alcohols \n(g)'),
        fv('Total sugars (g)'),
        fv('Total dietary fibre \n(g)'),
        fv('Sodium (Na) \n(mg)'),
        fv('Potassium (K) \n(mg)'),
        fv('Calcium (Ca) \n(mg)'),
        fv('Iron (Fe) \n(mg)'),
        fv('Vitamin C \n(mg)'),
        fv('Vitamin A retinol equivalents \n(ug)'),
        fv('Cholesterol \n(mg)'),
        fv('Total saturated fatty acids, equated \n(g)'),
        fv('Total monounsaturated fatty acids, equated \n(g)'),
        fv('Total polyunsaturated fatty acids, equated \n(g)'),
        trans_fat_g,
        psycopg2.extras.Json(custom_nutrients),
        food_id,
    ))

    # ---- afcd_nutrients upsert (ALL 268 nutrients) ----
    nutrient_rows = []
    for col in nutrient_cols:
        value = safe_float(row.get(col))
        key, unit, label = key_map[col]
        nutrient_rows.append((food_id, key, label, value, unit))

    if nutrient_rows:
        psycopg2.extras.execute_values(cur, """
            INSERT INTO public.afcd_nutrients (food_id, nutrient_key, nutrient_label, value, unit)
            VALUES %s
            ON CONFLICT (food_id, nutrient_key) DO UPDATE
              SET value = EXCLUDED.value
        """, nutrient_rows)

    return food_id


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    load_env()

    if not FOOD_DETAILS_FILE.exists():
        print(f"ERROR: {FOOD_DETAILS_FILE} not found", file=sys.stderr)
        sys.exit(1)
    if not NUTRIENT_PROFILE_FILE.exists():
        print(f"ERROR: {NUTRIENT_PROFILE_FILE} not found", file=sys.stderr)
        sys.exit(1)

    details = load_food_details()
    nutrients_df, nutrient_cols = load_nutrient_profiles()

    # Build stable key map for all nutrient columns
    key_map = build_nutrient_key_map(nutrient_cols)
    print(f"  {len(key_map)} unique nutrient keys mapped")

    # Merge food description from details into nutrients df
    merged = nutrients_df.join(details[['Food Description']], how='left')
    print(f"\nMerged: {len(merged)} foods to import")

    print("\nConnecting to database...")
    conn = get_db_conn()
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            ensure_provider_type(cur)

            inserted = 0
            errors = 0

            for public_food_key, row in merged.iterrows():
                food_name = str(row.get('Food Name', '')).strip()
                if not food_name:
                    continue

                derivation = str(row.get('Derivation', ''))
                food_description = row.get('Food Description')

                try:
                    upsert_food(
                        cur,
                        public_food_key=str(public_food_key),
                        food_name=food_name,
                        food_description=food_description,
                        derivation=derivation,
                        row=row,
                        nutrient_cols=nutrient_cols,
                        key_map=key_map,
                    )
                    inserted += 1

                    if inserted % 100 == 0:
                        print(f"  {inserted} foods processed...")
                        conn.commit()

                except Exception as e:
                    print(f"  ERROR on {public_food_key} ({food_name}): {e}", file=sys.stderr)
                    conn.rollback()
                    errors += 1

            conn.commit()

        print(f"\nDone. {inserted} foods upserted, {errors} errors.")
        print(f"Each food has up to {len(nutrient_cols)} nutrient rows in afcd_nutrients.")
        print("\nAttribution:")
        print("  Nutrient data sourced from the Australian Food Composition Database,")
        print("  Release 3 (December 2025), Food Standards Australia New Zealand.")
        print("  https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd")

    except Exception as e:
        conn.rollback()
        print(f"FATAL: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
