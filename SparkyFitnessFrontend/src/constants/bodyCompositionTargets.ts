/**
 * Evidence-based protein and calorie targets for body composition goals.
 *
 * All recommendations are grounded in peer-reviewed meta-analyses and position
 * statements. Sources are cited inline so the rationale is always traceable.
 *
 * Key sources:
 *
 *   [Morton2018]  Morton RW et al. "A systematic review, meta-analysis and
 *                 meta-regression of the effect of protein supplementation on
 *                 resistance training-induced gains in muscle mass and strength."
 *                 Br J Sports Med, 2018. PMID 28698222.
 *                 → Population-level protein ceiling ~1.62 g/kg; 95% CI upper
 *                   bound ~2.2 g/kg. Effect attenuated with age.
 *
 *   [Helms2014a]  Helms ER et al. "A systematic review of dietary protein during
 *                 caloric restriction in resistance trained lean athletes."
 *                 Int J Sport Nutr Exerc Metab, 2014. PMID 24092765.
 *                 → 2.3–3.1 g/kg FFM/day for lean athletes cutting. Leanness
 *                   and deficit severity both increase the requirement.
 *
 *   [Helms2014b]  Helms ER, Aragon AA, Fitschen PJ. "Evidence-based
 *                 recommendations for natural bodybuilding contest preparation."
 *                 J Int Soc Sports Nutr, 2014. PMC4033492.
 *                 → 0.5–1% BW/week loss rate maximises LBM retention while
 *                   cutting; surplus 200–300 kcal for lean bulk.
 *
 *   [ISSN2017]    Jäger R et al. "ISSN Position Stand: protein and exercise."
 *                 J Int Soc Sports Nutr, 2017. PMC5477153.
 *                 → 1.4–2.0 g/kg for general hypertrophy; 2.3–3.1 g/kg during
 *                   hypocaloric conditions for resistance-trained individuals.
 *
 *   [Schoenfeld2018] Schoenfeld BJ, Aragon AA. "How much protein can the body
 *                 use in a single meal for muscle-building?"
 *                 J Int Soc Sports Nutr, 2018.
 *                 → Practical upper range 1.6–2.2 g/kg/day for muscle gain.
 *
 *   [Stokes2021]  Stokes T et al. "Dose–response relationship between protein
 *                 intake and muscle mass increase." Nutr Rev, 2021. PMID 33300582.
 *                 → Refines Morton 2018: no sharp plateau; benefits continue
 *                   toward 2.2 g/kg with diminishing but non-zero returns.
 *
 *   [Trommelen2023] Trommelen J et al. "The anabolic response to protein
 *                 ingestion during recovery from exercise has no upper limit."
 *                 Cell Rep Med, 2023. PMID 38118410.
 *                 → Per-meal ceiling dogma revised; total daily intake is
 *                   the key variable, not per-meal dose.
 *
 *   [Murphy2022]  Murphy CH et al. "Energy deficiency impairs resistance training
 *                 gains in lean mass but not strength." Scand J Med Sci Sports,
 *                 2022. PMID 34623696.
 *                 → Meta-analysis: >500 kcal/day deficit impairs LBM gains even
 *                   with resistance training. Strength gains remain preserved.
 *
 *   [Slater2019]  Slater GJ et al. "Is an Energy Surplus Required to Maximize
 *                 Skeletal Muscle Hypertrophy?" Front Nutr, 2019. PMC6710320.
 *                 → Small surplus (200–300 kcal) produces similar muscle gain to
 *                   large surplus but with significantly less fat gain.
 */

export type GoalMode = 'cut' | 'maintain' | 'bulk';

// ── Protein targets (g per kg of body weight per day) ─────────────────────────

export interface ProteinTarget {
  /** Lower bound — minimum for goal. */
  min: number;
  /** Centre of evidence range — use as the default recommendation. */
  target: number;
  /** Upper practical bound — no meaningful benefit above this for most people. */
  max: number;
  /** Plain-English rationale shown to the user. */
  rationale: string;
  /** Short source attribution shown alongside the number. */
  sources: string[];
}

export const PROTEIN_TARGETS: Record<GoalMode, ProteinTarget> = {
  cut: {
    min: 1.8,
    target: 2.3,
    max: 2.7,
    rationale:
      'Higher protein during a calorie deficit protects muscle mass. The leaner you are and the larger the deficit, the higher you should go. Aim for the upper end if you are already lean or training hard.',
    sources: ['Helms et al. 2014 (IJSNEM)', 'ISSN Position Stand 2017'],
  },
  maintain: {
    min: 1.6,
    target: 1.8,
    max: 2.2,
    rationale:
      '1.6–2.2 g/kg is sufficient for most resistance-trained adults at maintenance calories. The upper end provides a comfortable margin and supports muscle protein turnover.',
    sources: [
      'Schoenfeld & Aragon 2018',
      'Morton et al. 2018 (BJSM)',
      'Stokes et al. 2021',
    ],
  },
  bulk: {
    min: 1.6,
    target: 2.0,
    max: 2.2,
    rationale:
      'During a caloric surplus, 1.6–2.2 g/kg is optimal. A caloric surplus does not increase protein requirements substantially — the extra calories provide the energy; protein provides the building blocks.',
    sources: [
      'Morton et al. 2018 (BJSM)',
      'ISSN Position Stand 2017',
      'Schoenfeld & Aragon 2018',
    ],
  },
};

// ── Calorie adjustments from TDEE (kcal/day) ──────────────────────────────────

export interface CalorieAdjustment {
  /** Kcal offset from TDEE (negative = deficit, positive = surplus). */
  kcalOffset: number;
  /** Target body weight change rate as % of current body weight per week. */
  weeklyWeightChangePercent: number;
  /** Plain-English rationale shown to the user. */
  rationale: string;
  /** Short source attribution. */
  sources: string[];
}

export const CALORIE_ADJUSTMENTS: Record<GoalMode, CalorieAdjustment> = {
  cut: {
    kcalOffset: -500,
    weeklyWeightChangePercent: -0.75,
    rationale:
      'A 500 kcal/day deficit is the evidence-based maximum for preserving muscle. Larger deficits impair lean mass gains disproportionately even with resistance training. Target 0.5–1% of body weight loss per week.',
    sources: [
      'Murphy et al. 2022 (Scand J Med Sci Sports)',
      'Helms et al. 2014',
    ],
  },
  maintain: {
    kcalOffset: 0,
    weeklyWeightChangePercent: 0,
    rationale:
      'Eat at your TDEE. Adjust every 2 weeks based on your actual body weight trend — if weight is changing, TDEE estimate needs correction.',
    sources: ['Helms et al. 2014'],
  },
  bulk: {
    kcalOffset: 250,
    weeklyWeightChangePercent: 0.35,
    rationale:
      'A 200–300 kcal/day surplus (lean bulk) produces similar muscle gain to a larger surplus but with significantly less fat gain. Target 0.25–0.5% body weight gain per week. Rate of muscle gain is physiologically limited regardless of surplus size.',
    sources: ['Slater et al. 2019 (Front Nutr)', 'Helms et al. 2014'],
  },
};

// ── Age-specific caveats ───────────────────────────────────────────────────────

/**
 * Adults over 50 have a blunted anabolic response to protein (anabolic resistance).
 * They should aim for the UPPER end of protein ranges regardless of goal mode.
 * Source: Morton et al. 2018; Trommelen et al. 2023 (Cell Rep Med).
 */
export const OLDER_ADULT_PROTEIN_NOTE =
  'Adults over 50 have a blunted anabolic response to protein. Aim for the upper end of the protein range and ensure at least 35–40 g protein per meal to overcome anabolic resistance.';

export const OLDER_ADULT_AGE_THRESHOLD = 50;

// ── Body recomposition eligibility ────────────────────────────────────────────

/**
 * Body recomposition (gaining muscle while losing fat simultaneously) is viable
 * for beginners, detrained individuals, and those with higher body fat.
 * Standard cut/bulk phases provide less additional benefit in these cases.
 *
 * Approximate eligibility thresholds (body fat %):
 *   Male:   ≥ 20% BF — recomp likely viable
 *   Female: ≥ 28% BF — recomp likely viable
 */
export const RECOMP_BF_THRESHOLD = { male: 20, female: 28 };

export const RECOMP_NOTE =
  'At your current body fat level, you may be able to gain muscle and lose fat simultaneously (body recomposition). A standard cut/bulk cycle is still valid but not strictly required.';

// ── Activity multipliers (mirrors calorieCalculations.ts ACTIVITY_MULTIPLIERS) ─

// Mirrors the ActivityLevel type in PreferencesContext — do not add values here
// without also extending that type and the backend preference storage.
export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  not_much: 'Sedentary (desk job, little exercise)',
  light: 'Light (1–3 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  heavy: 'Active (6–7 days/week)',
};

export const ACTIVITY_MULTIPLIERS_FULL: Record<string, number> = {
  not_much: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
};
