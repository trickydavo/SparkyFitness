# Nutrition Science

## Philosophy

**Food first, supplements only where diet genuinely can't cover the gap.**

The app aims to get users as close to RDI as possible through food choices.
Supplements are flagged only for nutrients where absorption or availability
makes dietary sufficiency genuinely difficult — not as a first resort.

Early humans didn't have a perfect diet. The body is resilient.
The goal is informed eating, not clinical precision.

## Australian NRVs (Nutrient Reference Values)

Published by: NHMRC (National Health and Medical Research Council) + NZ Ministry of Health
Current version: 2006, updated for sodium/fluoride in 2017
Draft update: Under consultation December 2025, final anticipated 2026
Reference: https://www.eatforhealth.gov.au/nutrient-reference-values

NRV types used in this app:

| Type | Meaning | App use |
|---|---|---|
| RDI | Recommended Dietary Intake — covers 97-98% of healthy people | Primary target bar |
| EAR | Estimated Average Requirement — covers 50% | Below this = risk zone (red) |
| AI | Adequate Intake — used where RDI can't be set (e.g. vitamin D) | Target where no RDI |
| UL | Upper Level — toxicity ceiling | Warning if exceeded |

### Coverage thresholds for UI display
- >= RDI (or AI): Green ✓ — met
- 70-99% of RDI: Amber — approaching
- < 70% of RDI (but > EAR): Yellow — below target
- < EAR: Red — deficiency risk
- > UL: Grey warning — over upper limit

### NRV varies by age and sex
User profile must include: age, sex (male/female), life stage (default: adult)
Future: pregnancy, lactation flags for female users

## Key nutrients and Australian RDI values (adult reference)

### Macronutrients
| Nutrient | Male 31-50 | Female 31-50 | Unit |
|---|---|---|---|
| Protein | 64g | 46g | g/day |
| Total fat | 20-35% energy | 20-35% energy | % |
| Carbohydrate | 45-65% energy | 45-65% energy | % |
| Dietary fibre | 30g | 25g | g/day |

### Fat-soluble vitamins
| Nutrient | Male 31-50 | Female 31-50 | Unit | UL |
|---|---|---|---|---|
| Vitamin A | 900ug | 700ug | ug RAE/day | 3000ug |
| Vitamin D | 5ug (AI) | 5ug (AI) | ug/day | 80ug |
| Vitamin E | 10mg | 7mg | mg/day | 300mg |
| Vitamin K | 70ug (AI) | 60ug (AI) | ug/day | — |

### Water-soluble vitamins
| Nutrient | Male 31-50 | Female 31-50 | Unit | UL |
|---|---|---|---|---|
| Vitamin C | 45mg | 45mg | mg/day | 1000mg |
| Thiamin B1 | 1.2mg | 1.1mg | mg/day | — |
| Riboflavin B2 | 1.3mg | 1.1mg | mg/day | — |
| Niacin B3 | 16mg NE | 14mg NE | mg NE/day | 35mg |
| Pantothenic B5 | 6mg (AI) | 4mg (AI) | mg/day | — |
| Pyridoxine B6 | 1.3mg | 1.3mg | mg/day | 50mg |
| Biotin B7 | 30ug (AI) | 25ug (AI) | ug/day | — |
| Folate | 400ug DFE | 400ug DFE | ug DFE/day | 1000ug |
| Cobalamin B12 | 2.4ug | 2.4ug | ug/day | — |

### Minerals
| Nutrient | Male 31-50 | Female 31-50 | Unit | UL |
|---|---|---|---|---|
| Calcium | 1000mg | 1000mg | mg/day | 2500mg |
| Iron | 8mg | 18mg | mg/day | 45mg |
| Zinc | 14mg | 8mg | mg/day | 40mg |
| Magnesium | 420mg | 320mg | mg/day | 350mg (supps only) |
| Potassium | 3800mg (AI) | 2800mg (AI) | mg/day | — |
| Sodium | 460-920mg | 460-920mg | mg/day | 2300mg |
| Iodine | 150ug | 150ug | ug/day | 1100ug |
| Selenium | 70ug | 60ug | ug/day | 400ug |
| Phosphorus | 1000mg | 1000mg | mg/day | 4000mg |

Note: Iron RDI is significantly higher for premenopausal women (18mg vs 8mg for men).
Post-menopause women: iron drops to 8mg.

## Supplement flags — science basis

These nutrients are flagged for supplement consideration based on peer-reviewed evidence:

### Vitamin D
- Aging skin produces less D3 from sun exposure
- Conversion to active form decreases with age
- 40-90% of seniors globally have inadequate levels
- Food sources limited: fatty fish, fortified dairy, eggs
- Flag trigger: persistent gap below EAR + user age > 50
- Reference: PMC5918526, Vitamin D intake and aging research

### Vitamin B12
- Absorption requires intrinsic factor + stomach acid
- Stomach acid production decreases with age
- Acid-blocking medications (PPIs, H2 blockers) worsen absorption
- Up to 30% of adults over 50 have absorption issues
- Even adequate dietary intake may not translate to adequate absorption
- Flag trigger: persistent gap OR user age > 50 regardless of dietary intake
- Reference: NBK51837, NCBI Bookshelf

### Omega-3 (EPA/DHA)
- EPA and DHA specifically from fatty fish only (ALA from plants converts poorly)
- Cardiovascular benefit requires ~1g EPA+DHA/day — hard from diet alone without 3-4 fish servings/week
- Flag trigger: persistent gap in long-chain omega-3 below AI

### Calcium (age-related)
- Gut absorption of calcium decreases significantly after age 60
- Women post-menopause: needs increase to 1300mg/day
- Men over 70: needs increase to 1300mg/day
- Flag trigger: persistent gap + user age > 60 (or > 50 for females)

### What NOT to flag
- Most vitamins and minerals are achievable through varied diet
- Do not flag nutrients just because a single day is low
- Use 7-day rolling average for all gap calculations
- Single-day variation is normal and expected

## Trending and gap analysis

### 7-day rolling average
All micronutrient gap calculations use 7-day rolling averages, not single-day values.
Single days below RDI are normal. Persistent gaps are meaningful.

### Gap detection thresholds
- Flag as food gap: 7-day average < 70% RDI for 2+ consecutive weeks
- Flag for supplement: 7-day average < EAR for nutrients in supplement list above

### Food suggestions for gap closing
When a gap is detected, query AFCD for top 10 foods that:
1. Have high per-100g content of the deficient nutrient
2. Are foods the user has logged before (personalised first)ig
3. Are commonly eaten Australian foods (AFCD Analysed derivation preferred)

Query pattern:
```sql
SELECT f.name, an.value as nutrient_per_100g, f.source
FROM foods f
JOIN afcd_nutrients an ON f.id = an.food_id
WHERE an.nutrient_name = $1
  AND f.source = 'afcd'
  AND f.is_verified = TRUE
ORDER BY an.value DESC
LIMIT 10;
```

## Body composition goals

### Goal modes
- **Cut** — calorie deficit, preserve lean mass
- **Maintain** — at TDEE, body recomposition possible
- **Bulk** — calorie surplus, muscle gain focus

### TDEE calculation (Mifflin-St Jeor)
```
Males:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
Females: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161

Activity multipliers:
  Sedentary (desk job, no exercise): BMR × 1.2
  Light (1-3 days/week): BMR × 1.375
  Moderate (3-5 days/week): BMR × 1.55
  Active (6-7 days/week): BMR × 1.725
  Very active (physical job + training): BMR × 1.9

TDEE = BMR × activity_multiplier
```

### Calorie targets by goal

| Goal | Offset from TDEE | Weekly weight change | Key sources |
|---|---|---|---|
| Cut | −500 kcal/day (max) | −0.5 to −1.0% BW/week | Murphy et al. 2022 (PMID 34623696); Helms et al. 2014 |
| Maintain | 0 | 0 | — |
| Bulk | +250 kcal/day | +0.25 to +0.5% BW/week | Slater et al. 2019 (PMC6710320); Helms et al. 2014 |

Murphy et al. 2022 meta-analysis: deficits >500 kcal/day impair lean mass gains even with resistance training.
Slater et al. 2019: small surplus (200–300 kcal) produces similar muscle gain to larger surplus with significantly less fat gain.

### Protein targets by goal (verified peer-reviewed sources)

| Goal | Range (g/kg BW/day) | Target | Key sources |
|---|---|---|---|
| Cut | 1.8–2.7 | 2.3 | Helms et al. 2014 (IJSNEM, PMID 24092765); ISSN 2017 (PMC5477153) |
| Maintain | 1.6–2.2 | 1.8 | Schoenfeld & Aragon 2018; Morton et al. 2018 (PMID 28698222) |
| Bulk | 1.6–2.2 | 2.0 | Morton et al. 2018; ISSN 2017; Stokes et al. 2021 (PMID 33300582) |

Age caveat: Adults >50 have anabolic resistance — aim for upper end of range + 35–40g/meal minimum.
Source: Morton et al. 2018; Trommelen et al. 2023 (Cell Rep Med, PMID 38118410).

### Weekly weight-based recalculation
After 2 weeks of data:
- If weight change is 0 and goal is cut: reduce calories by 100 kcal
- If weight gain > 0.5kg/week on bulk: already at surplus, maintain
- If weight loss > 0.75kg/week on cut: increase calories by 100 kcal (preserve lean mass)
- Recalculate every 2 weeks maximum

## Training — RIR and hypertrophy (Phase 2 feature)

### RIR (Reps in Reserve) — RP methodology
- RIR = how many reps you could have done beyond your last rep
- Training range: start at 4 RIR, progress to 1 RIR by end of mesocycle
- Research shows < 4-5 RIR needed for meaningful hypertrophy stimulus
- Reference: RP Strength / Israetel et al., Mesocycle Progression in Hypertrophy paper

### Mesocycle structure
- Length: 4-6 weeks (6 weeks typical)
- Week 1-2: MEV (Minimum Effective Volume) — building base
- Week 3-5: Accumulation — volume increases toward MRV
- Week 6: Peak/deload — volume drops 50%, intensity drops

### Volume landmarks per muscle group
- MEV: Minimum Effective Volume — smallest number of sets producing growth
- MAV: Maximum Adaptive Volume — optimal range for most growth
- MRV: Maximum Recoverable Volume — beyond this, recovery fails

These are individual and must be estimated, then refined over time.
Starting estimates from RP: most muscle groups 10-20 sets/week.

This is a Phase 2 feature — do not implement until Phase 1 (nutrition) is complete and stable.
