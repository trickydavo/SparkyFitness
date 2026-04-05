#!/usr/bin/env python3
"""
AFCD Release 3 ETL — seeds the fuelright_prod database with Australian Food
Composition Database data.

Run with:
    source ~/fuelright-scripts/bin/activate
    python3 ~/fuelright/scripts/seed_afcd.py

Requires the AFCD xlsx files at ~/fuelright/data/afcd/.
"""

import os
import re
import sys
import uuid
import psycopg2
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

# Nutrient column → food_variants DB column mapping.
# AFCD values are per 100g.
NUTRIENT_MAP = {
    'Energy with dietary fibre, equated \n(kJ)':          'energy_kj',       # stored in custom_nutrients
    'Protein \n(g)':                                       'protein',
    'Fat, total \n(g)':                                    'fat',
    'Available carbohydrate, without sugar alcohols \n(g)': 'carbs',
    'Total sugars (g)':                                    'sugars',
    'Total dietary fibre \n(g)':                           'dietary_fiber',
    'Sodium (Na) \n(mg)':                                  'sodium',
    'Potassium (K) \n(mg)':                                'potassium',
    'Calcium (Ca) \n(mg)':                                 'calcium',
    'Iron (Fe) \n(mg)':                                    'iron',
    'Vitamin C \n(mg)':                                    'vitamin_c',
    'Vitamin A retinol equivalents \n(ug)':                'vitamin_a',
    'Cholesterol \n(mg)':                                  'cholesterol',
    'Total saturated fatty acids, equated \n(g)':          'saturated_fat',
    'Total monounsaturated fatty acids, equated \n(g)':    'monounsaturated_fat',
    'Total polyunsaturated fatty acids, equated \n(g)':    'polyunsaturated_fat',
    'Total trans fatty acids, imputed \n(mg)':             'trans_fat',       # mg → g conversion needed
}

# kJ to kcal conversion
KJ_TO_KCAL = 0.239006


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
    """Return float or 0.0 for NaN/None."""
    try:
        f = float(val)
        return 0.0 if pd.isna(f) else round(f / divisor, 4)
    except (TypeError, ValueError):
        return 0.0


def kj_to_kcal(kj):
    return round(safe_float(kj) * KJ_TO_KCAL, 2)


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
    return df.set_index('Public Food Key')


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


def upsert_food(cur, public_food_key, food_name, food_description, derivation, nutrients):
    """
    Upsert into foods + food_variants. Returns food_id.
    All AFCD foods are public (user_id = NULL, shared_with_public = TRUE).
    """
    is_verified = derivation == 'Analysed'

    # foods upsert — SELECT first, then INSERT if missing
    cur.execute("""
        SELECT id FROM public.foods
        WHERE provider_external_id = %s AND provider_type = %s
    """, (public_food_key, PROVIDER_TYPE_ID))
    row = cur.fetchone()

    if row:
        food_id = row[0]
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

    # Build custom_nutrients for extra AFCD fields not in food_variants columns
    energy_kj = nutrients.pop('energy_kj', 0.0)
    custom_nutrients = {
        'energy_kj': energy_kj,
        'is_verified': is_verified,
        'afcd_derivation': derivation,
    }
    if food_description and not pd.isna(food_description):
        custom_nutrients['description'] = str(food_description)

    # calories (kcal) from kJ
    calories = kj_to_kcal(energy_kj)

    # trans_fat in AFCD is in mg — convert to g
    if 'trans_fat' in nutrients:
        nutrients['trans_fat'] = round(nutrients['trans_fat'] / 1000, 4)

    # food_variants insert — only if no default variant exists yet for this food
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
        nutrients.get('protein', 0.0),
        nutrients.get('fat', 0.0),
        nutrients.get('carbs', 0.0),
        nutrients.get('sugars', 0.0),
        nutrients.get('dietary_fiber', 0.0),
        nutrients.get('sodium', 0.0),
        nutrients.get('potassium', 0.0),
        nutrients.get('calcium', 0.0),
        nutrients.get('iron', 0.0),
        nutrients.get('vitamin_c', 0.0),
        nutrients.get('vitamin_a', 0.0),
        nutrients.get('cholesterol', 0.0),
        nutrients.get('saturated_fat', 0.0),
        nutrients.get('monounsaturated_fat', 0.0),
        nutrients.get('polyunsaturated_fat', 0.0),
        nutrients.get('trans_fat', 0.0),
        psycopg2.extras.Json(custom_nutrients),
        food_id,  # for WHERE NOT EXISTS subquery
    ))

    return food_id


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import psycopg2.extras

    load_env()

    if not FOOD_DETAILS_FILE.exists():
        print(f"ERROR: {FOOD_DETAILS_FILE} not found", file=sys.stderr)
        sys.exit(1)

    details = load_food_details()
    nutrients_df = load_nutrient_profiles()

    # Merge on Public Food Key
    merged = nutrients_df.join(details[['Food Description']], how='left')
    print(f"\nMerged: {len(merged)} foods to import")

    print("\nConnecting to database...")
    conn = get_db_conn()
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            psycopg2.extras  # ensure imported
            ensure_provider_type(cur)

            inserted = 0
            errors = 0

            for public_food_key, row in merged.iterrows():
                food_name = str(row.get('Food Name', '')).strip()
                if not food_name:
                    continue

                # Extract mapped nutrients
                nutrients = {}
                for afcd_col, db_col in NUTRIENT_MAP.items():
                    if afcd_col in row.index:
                        nutrients[db_col] = safe_float(row[afcd_col])

                try:
                    upsert_food(
                        cur,
                        public_food_key=str(public_food_key),
                        food_name=food_name,
                        food_description=row.get('Food Description'),
                        derivation=str(row.get('Derivation', '')),
                        nutrients=nutrients,
                    )
                    inserted += 1

                    if inserted % 100 == 0:
                        print(f"  {inserted} foods inserted...")
                        conn.commit()

                except Exception as e:
                    print(f"  ERROR on {public_food_key} ({food_name}): {e}", file=sys.stderr)
                    conn.rollback()
                    errors += 1

            conn.commit()

        print(f"\nDone. {inserted} foods upserted, {errors} errors.")
        print("\nAttribution reminder:")
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
