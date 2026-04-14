/**
 * Australian Nutrient Reference Values (NRV) — adult reference.
 *
 * Source: NHMRC / NZ Ministry of Health, 2006 (sodium/fluoride updated 2017).
 * https://www.eatforhealth.gov.au/nutrient-reference-values
 *
 * Values here are conservative adult references (generally the lower of
 * male/female RDI, or the midpoint where ranges are tight). They are used
 * as informational targets only — not personalised to age or sex.
 *
 * Keys match the nutrient_key values in the afcd_nutrients table.
 *
 * NRV types:
 *   rdi  — Recommended Dietary Intake (covers ~97-98% healthy people)
 *   ear  — Estimated Average Requirement (covers ~50%)
 *   ai   — Adequate Intake (used where RDI can't be set)
 *   ul   — Upper Level (toxicity ceiling — warn if exceeded)
 *
 * effectiveTarget = rdi ?? ai  (used for coverage bar)
 * Coverage: green ≥100%, amber 70-99%, red <70%, over-ul = warning
 */

export interface NrvEntry {
  label: string;
  unit: string;
  group: 'vitamins' | 'minerals' | 'fatty_acids';
  rdi: number | null;
  ear: number | null;
  ai: number | null;
  ul: number | null;
}

export const NRV_REFERENCE: Record<string, NrvEntry> = {
  // ── Fat-soluble vitamins ───────────────────────────────────────────────
  vitamin_a_retinol_equivalents_ug: {
    label: 'Vitamin A',
    unit: 'µg',
    group: 'vitamins',
    rdi: 700,
    ear: 500,
    ai: null,
    ul: 3000,
  },
  vitamin_d3_equivalents_ug: {
    label: 'Vitamin D',
    unit: 'µg',
    group: 'vitamins',
    rdi: null,
    ear: null,
    ai: 5,
    ul: 80,
  },
  alpha_tocopherol_mg: {
    label: 'Vitamin E',
    unit: 'mg',
    group: 'vitamins',
    rdi: 7,
    ear: null,
    ai: null,
    ul: 300,
  },

  // ── Water-soluble vitamins ─────────────────────────────────────────────
  vitamin_c_mg: {
    label: 'Vitamin C',
    unit: 'mg',
    group: 'vitamins',
    rdi: 45,
    ear: 30,
    ai: null,
    ul: 1000,
  },
  thiamin_b1_mg: {
    label: 'Thiamin (B1)',
    unit: 'mg',
    group: 'vitamins',
    rdi: 1.1,
    ear: 0.9,
    ai: null,
    ul: null,
  },
  riboflavin_b2_mg: {
    label: 'Riboflavin (B2)',
    unit: 'mg',
    group: 'vitamins',
    rdi: 1.1,
    ear: 0.9,
    ai: null,
    ul: null,
  },
  // Use niacin_derived_equivalents_mg for the most complete picture (includes tryptophan conversion)
  niacin_derived_equivalents_mg: {
    label: 'Niacin (B3)',
    unit: 'mg NE',
    group: 'vitamins',
    rdi: 14,
    ear: 10,
    ai: null,
    ul: 35,
  },
  pantothenic_acid_b5_mg: {
    label: 'Pantothenic Acid (B5)',
    unit: 'mg',
    group: 'vitamins',
    rdi: null,
    ear: null,
    ai: 4,
    ul: null,
  },
  pyridoxine_b6_mg: {
    label: 'Vitamin B6',
    unit: 'mg',
    group: 'vitamins',
    rdi: 1.3,
    ear: 1.1,
    ai: null,
    ul: 50,
  },
  biotin_b7_ug: {
    label: 'Biotin (B7)',
    unit: 'µg',
    group: 'vitamins',
    rdi: null,
    ear: null,
    ai: 25,
    ul: null,
  },
  dietary_folate_equivalents_ug: {
    label: 'Folate',
    unit: 'µg DFE',
    group: 'vitamins',
    rdi: 400,
    ear: 320,
    ai: null,
    ul: 1000,
  },
  cobalamin_b12_ug: {
    label: 'Vitamin B12',
    unit: 'µg',
    group: 'vitamins',
    rdi: 2.4,
    ear: 2.0,
    ai: null,
    ul: null,
  },

  // ── Minerals ──────────────────────────────────────────────────────────
  calcium_mg: {
    label: 'Calcium',
    unit: 'mg',
    group: 'minerals',
    rdi: 1000,
    ear: 840,
    ai: null,
    ul: 2500,
  },
  iron_mg: {
    label: 'Iron',
    unit: 'mg',
    group: 'minerals',
    rdi: 8,
    ear: 6,
    ai: null,
    ul: 45,
  },
  zinc_mg: {
    label: 'Zinc',
    unit: 'mg',
    group: 'minerals',
    rdi: 8,
    ear: 6,
    ai: null,
    ul: 40,
  },
  magnesium_mg: {
    label: 'Magnesium',
    unit: 'mg',
    group: 'minerals',
    rdi: 320,
    ear: 255,
    ai: null,
    ul: null, // UL applies to supplements only
  },
  potassium_mg: {
    label: 'Potassium',
    unit: 'mg',
    group: 'minerals',
    rdi: null,
    ear: null,
    ai: 2800,
    ul: null,
  },
  sodium_mg: {
    label: 'Sodium',
    unit: 'mg',
    group: 'minerals',
    rdi: null,
    ear: null,
    ai: 460,
    ul: 2300,
  },
  iodine_ug: {
    label: 'Iodine',
    unit: 'µg',
    group: 'minerals',
    rdi: 150,
    ear: 100,
    ai: null,
    ul: 1100,
  },
  selenium_ug: {
    label: 'Selenium',
    unit: 'µg',
    group: 'minerals',
    rdi: 60,
    ear: 50,
    ai: null,
    ul: 400,
  },
  phosphorus_mg: {
    label: 'Phosphorus',
    unit: 'mg',
    group: 'minerals',
    rdi: 1000,
    ear: 580,
    ai: null,
    ul: 4000,
  },

  // ── Fatty acids ────────────────────────────────────────────────────────
  // Long-chain omega-3 (EPA + DHA combined) — use this as the primary omega-3 metric
  total_long_chain_omega_3_fatty_acids_equated_mg: {
    label: 'Long-chain Omega-3 (EPA+DHA)',
    unit: 'mg',
    group: 'fatty_acids',
    rdi: null,
    ear: null,
    ai: 610, // Men; women 430mg — using higher for safety margin
    ul: null,
  },
  // ALA (plant omega-3) — separate from EPA+DHA
  c18_3w3_g: {
    label: 'ALA (α-Linolenic acid)',
    unit: 'g',
    group: 'fatty_acids',
    rdi: null,
    ear: null,
    ai: 1.3, // Men; women 0.8g
    ul: null,
  },
};

/**
 * Fixed NRV-aligned micronutrient fields for the custom food form.
 * Keys match nutrient_key in NRV_REFERENCE and afcd_nutrients.
 * Values are stored in food_variants.custom_nutrients JSONB, per serving.
 * These nutrients are not stored as standard food_variants columns —
 * this covers vitamins/minerals not in the standard 17-field schema.
 */
export const NRV_MICRONUTRIENT_FORM_FIELDS: {
  key: string;
  label: string;
  unit: string;
  step: string;
}[] = [
  {
    key: 'vitamin_d3_equivalents_ug',
    label: 'Vitamin D',
    unit: 'µg',
    step: '0.1',
  },
  { key: 'alpha_tocopherol_mg', label: 'Vitamin E', unit: 'mg', step: '0.1' },
  { key: 'thiamin_b1_mg', label: 'Thiamin (B1)', unit: 'mg', step: '0.01' },
  {
    key: 'riboflavin_b2_mg',
    label: 'Riboflavin (B2)',
    unit: 'mg',
    step: '0.01',
  },
  {
    key: 'niacin_derived_equivalents_mg',
    label: 'Niacin (B3)',
    unit: 'mg NE',
    step: '0.1',
  },
  {
    key: 'pantothenic_acid_b5_mg',
    label: 'Pantothenic Acid (B5)',
    unit: 'mg',
    step: '0.1',
  },
  { key: 'pyridoxine_b6_mg', label: 'Vitamin B6', unit: 'mg', step: '0.01' },
  { key: 'biotin_b7_ug', label: 'Biotin (B7)', unit: 'µg', step: '0.1' },
  {
    key: 'dietary_folate_equivalents_ug',
    label: 'Folate',
    unit: 'µg DFE',
    step: '1',
  },
  { key: 'cobalamin_b12_ug', label: 'Vitamin B12', unit: 'µg', step: '0.01' },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg', step: '0.1' },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', step: '1' },
  { key: 'iodine_ug', label: 'Iodine', unit: 'µg', step: '1' },
  { key: 'selenium_ug', label: 'Selenium', unit: 'µg', step: '1' },
  { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg', step: '1' },
  {
    key: 'total_long_chain_omega_3_fatty_acids_equated_mg',
    label: 'Omega-3 EPA+DHA',
    unit: 'mg',
    step: '1',
  },
  { key: 'c18_3w3_g', label: 'ALA (plant omega-3)', unit: 'g', step: '0.01' },
];

/** Set of NRV micronutrient keys for quick lookup in form hooks. */
export const NRV_MICRONUTRIENT_KEYS = new Set(
  NRV_MICRONUTRIENT_FORM_FIELDS.map((f) => f.key)
);

/** The nutrient_keys already tracked in food_variants / CENTRAL_NUTRIENT_CONFIG.
 *  We skip these in the "extended" AFCD panel to avoid duplication.
 *  (They are shown in the standard nutrients section instead.)
 */
export const STANDARD_NUTRIENT_KEYS = new Set([
  'calories',
  'protein',
  'carbs',
  'fat',
  'saturated_fat',
  'polyunsaturated_fat',
  'monounsaturated_fat',
  'trans_fat',
  'cholesterol',
  'sodium', // also in afcd_nutrients as sodium_mg — show in extended with UL context
  'potassium',
  'dietary_fiber',
  'sugars',
  'vitamin_a',
  'vitamin_c',
  'calcium',
  'iron',
]);

/**
 * Returns a sex-personalised NRV_REFERENCE.
 * Overrides the generic values for nutrients that differ meaningfully between sexes.
 * Falls back to the generic NRV_REFERENCE if sex is null.
 */
export function getNrvReference(
  sex: 'male' | 'female' | null
): Record<string, NrvEntry> {
  if (!sex) return NRV_REFERENCE;

  const overrides: Partial<Record<string, Partial<NrvEntry>>> =
    sex === 'male'
      ? {
          // Iron: male 8mg RDI (vs 18mg female)
          iron_mg: { rdi: 8, ear: 6 },
          // Zinc: male 14mg RDI (vs 8mg female)
          zinc_mg: { rdi: 14, ear: 11 },
          // Magnesium: male 420mg RDI (vs 320mg female)
          magnesium_mg: { rdi: 420, ear: 350 },
          // Potassium: male 3800mg AI (vs 2800mg female)
          potassium_mg: { ai: 3800 },
          // Vitamin A: male 900µg RDI (vs 700µg female)
          vitamin_a_retinol_equivalents_ug: { rdi: 900, ear: 625 },
          // Thiamin: male 1.2mg (vs 1.1mg female)
          thiamin_b1_mg: { rdi: 1.2, ear: 1.0 },
          // Riboflavin: male 1.3mg (vs 1.1mg female)
          riboflavin_b2_mg: { rdi: 1.3, ear: 1.0 },
          // Niacin: male 16mg NE (vs 14mg female)
          niacin_derived_equivalents_mg: { rdi: 16, ear: 12 },
          // Biotin: male 30µg AI (vs 25µg female)
          biotin_b7_ug: { ai: 30 },
          // Selenium: male 70µg RDI (vs 60µg female)
          selenium_ug: { rdi: 70, ear: 60 },
          // Omega-3 AI: male 610mg (vs 430mg female)
          total_long_chain_omega_3_fatty_acids_equated_mg: { ai: 610 },
          // ALA: male 1.3g AI (vs 0.8g female)
          c18_3w3_g: { ai: 1.3 },
        }
      : {
          // Iron: female 18mg RDI (premenopausal)
          iron_mg: { rdi: 18, ear: 8 },
          // Zinc: female 8mg RDI
          zinc_mg: { rdi: 8, ear: 6 },
          // Magnesium: female 320mg RDI
          magnesium_mg: { rdi: 320, ear: 255 },
          // Potassium: female 2800mg AI
          potassium_mg: { ai: 2800 },
          // Vitamin A: female 700µg RDI
          vitamin_a_retinol_equivalents_ug: { rdi: 700, ear: 500 },
          // Thiamin: female 1.1mg
          thiamin_b1_mg: { rdi: 1.1, ear: 0.9 },
          // Riboflavin: female 1.1mg
          riboflavin_b2_mg: { rdi: 1.1, ear: 0.9 },
          // Niacin: female 14mg NE
          niacin_derived_equivalents_mg: { rdi: 14, ear: 10 },
          // Biotin: female 25µg AI
          biotin_b7_ug: { ai: 25 },
          // Selenium: female 60µg RDI
          selenium_ug: { rdi: 60, ear: 50 },
          // Omega-3 AI: female 430mg
          total_long_chain_omega_3_fatty_acids_equated_mg: { ai: 430 },
          // ALA: female 0.8g AI
          c18_3w3_g: { ai: 0.8 },
        };

  const result: Record<string, NrvEntry> = {};
  for (const [key, base] of Object.entries(NRV_REFERENCE)) {
    result[key] = overrides[key] ? { ...base, ...overrides[key] } : base;
  }
  return result;
}

/** Returns the effective daily target (rdi preferred, fallback ai, null if neither). */
export function nrvEffectiveTarget(entry: NrvEntry): number | null {
  return entry.rdi ?? entry.ai ?? null;
}

/** Coverage 0-1+ (capped for display). Returns null if no target. */
export function nrvCoverage(value: number, entry: NrvEntry): number | null {
  const target = nrvEffectiveTarget(entry);
  if (target === null || target === 0) return null;
  return value / target;
}

/** Traffic-light colour class based on coverage ratio. */
export function nrvColour(coverage: number | null): string {
  if (coverage === null) return 'bg-gray-300';
  if (coverage >= 1) return 'bg-green-500';
  if (coverage >= 0.7) return 'bg-amber-400';
  return 'bg-red-500';
}

/** Text colour for the coverage value. */
export function nrvTextColour(coverage: number | null): string {
  if (coverage === null) return 'text-muted-foreground';
  if (coverage >= 1) return 'text-green-600 dark:text-green-400';
  if (coverage >= 0.7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}
