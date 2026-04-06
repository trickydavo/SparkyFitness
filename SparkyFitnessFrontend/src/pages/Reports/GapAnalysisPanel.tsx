import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pill,
  Utensils,
} from 'lucide-react';
import { getNrvReference, nrvEffectiveTarget } from '@/constants/nrv';
import type { AfcdNutrientSummary } from '@/api/Reports/micronutrientService';
import { useTopFoodsForNutrient } from '@/hooks/Reports/useGapAnalysis';

interface Props {
  afcdData: AfcdNutrientSummary[];
  biologicalSex?: 'male' | 'female' | null;
  age?: number | null;
  isLoading: boolean;
}

// ── Supplement flag logic (evidence-based, from nutrition-science.md) ──────────

interface SupplementFlag {
  nutrientKey: string;
  reason: string;
  alwaysFlag?: boolean; // flag regardless of dietary intake (e.g. B12 >50)
}

function getSupplementFlags(
  age: number | null,
  sex: 'male' | 'female' | null
): SupplementFlag[] {
  const flags: SupplementFlag[] = [];
  const a = age ?? 0;

  // Vitamin D — aging skin, limited food sources
  flags.push({
    nutrientKey: 'vitamin_d3_equivalents_ug',
    reason:
      a >= 50
        ? 'Vitamin D synthesis from sun decreases with age. Supplement likely needed regardless of diet.'
        : 'Limited food sources. Consider supplement if gap persists.',
  });

  // B12 — absorption issues increase with age
  if (a >= 50) {
    flags.push({
      nutrientKey: 'cobalamin_b12_ug',
      reason:
        'Stomach acid production decreases after 50, impairing B12 absorption. Supplement recommended even with adequate dietary intake.',
      alwaysFlag: true,
    });
  } else {
    flags.push({
      nutrientKey: 'cobalamin_b12_ug',
      reason:
        'B12 gap detected. Consider supplement if dietary sources are limited.',
    });
  }

  // Omega-3 — EPA/DHA only from fatty fish, hard to hit AI from diet
  flags.push({
    nutrientKey: 'total_long_chain_omega_3_fatty_acids_equated_mg',
    reason:
      'EPA+DHA only from fatty fish. 3–4 servings/week needed to hit AI — consider fish oil if not achievable.',
  });

  // Calcium — absorption decreases significantly after 60
  if ((sex === 'female' && a >= 50) || a >= 60) {
    flags.push({
      nutrientKey: 'calcium_mg',
      reason:
        sex === 'female' && a >= 50
          ? 'Calcium needs increase post-menopause (1300mg). Supplement if dietary gap persists.'
          : 'Calcium absorption decreases after 60. Supplement if dietary gap persists.',
    });
  }

  return flags;
}

// ── Gap card with expandable food suggestions ─────────────────────────────────

function GapCard({
  nutrientKey,
  label,
  unit,
  avg,
  target,
  coverage,
  supplementFlag,
  alwaysShowSupplement,
}: {
  nutrientKey: string;
  label: string;
  unit: string;
  avg: number;
  target: number;
  coverage: number;
  supplementFlag?: string;
  alwaysShowSupplement?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: topFoods = [], isLoading } = useTopFoodsForNutrient(
    expanded ? nutrientKey : null
  );

  const pct = Math.round(coverage * 100);
  const colourBar = coverage >= 0.7 ? 'bg-amber-400' : 'bg-red-500';
  const colourText =
    coverage >= 0.7
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';
  const showSupplement =
    alwaysShowSupplement || (supplementFlag && coverage < 0.7);

  return (
    <Card className="border-l-4 border-l-red-400">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colourBar}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${colourText}`}>
                {avg.toFixed(avg < 10 ? 2 : 1)} / {target} {unit} ({pct}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showSupplement && (
              <Badge
                variant="outline"
                className="text-xs text-orange-600 border-orange-400 gap-1"
              >
                <Pill className="w-3 h-3" />
                Supplement
              </Badge>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Utensils className="w-3 h-3" />
              Food sources
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
        {showSupplement && supplementFlag && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            {supplementFlag}
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">
              Loading food sources…
            </p>
          ) : topFoods.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No AFCD food data for this nutrient.
            </p>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Top AFCD foods by {label} per 100g:
              </p>
              <div className="space-y-1">
                {topFoods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-foreground truncate max-w-[240px]">
                      {food.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {food.value.toFixed(food.value < 10 ? 2 : 1)} {food.unit}
                      /100g
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GapAnalysisPanel({
  afcdData,
  biologicalSex = null,
  age = null,
  isLoading,
}: Props) {
  const nrvRef = useMemo(
    () => getNrvReference(biologicalSex ?? null),
    [biologicalSex]
  );
  const supplementFlags = useMemo(
    () => getSupplementFlags(age ?? null, biologicalSex ?? null),
    [age, biologicalSex]
  );
  const suppFlagMap = useMemo(() => {
    const m: Record<string, { reason: string; alwaysFlag?: boolean }> = {};
    for (const f of supplementFlags) m[f.nutrientKey] = f;
    return m;
  }, [supplementFlags]);

  const afcdByKey = useMemo(() => {
    const m: Record<string, AfcdNutrientSummary> = {};
    for (const n of afcdData) m[n.nutrient_key] = n;
    return m;
  }, [afcdData]);

  // Detect gaps: nutrients where 7-day avg < 70% of effective target
  const gaps = useMemo(() => {
    return Object.entries(nrvRef)
      .map(([key, nrv]) => {
        const summary = afcdByKey[key];
        const avg = summary?.seven_day_avg ?? 0;
        const target = nrvEffectiveTarget(nrv);
        if (!target) return null;
        const coverage = avg / target;
        const suppFlag = suppFlagMap[key];
        // Always include supplement-flagged nutrients if they have an alwaysFlag
        if (coverage >= 0.7 && !suppFlag?.alwaysFlag) return null;
        return { key, nrv, avg, target, coverage, suppFlag };
      })
      .filter(Boolean)
      .sort((a, b) => a!.coverage - b!.coverage) as Array<{
      key: string;
      nrv: (typeof nrvRef)[string];
      avg: number;
      target: number;
      coverage: number;
      suppFlag?: { reason: string; alwaysFlag?: boolean };
    }>;
  }, [nrvRef, afcdByKey, suppFlagMap]);

  // Always-show supplement flags (e.g. B12 >50yo) regardless of dietary gap
  const alwaysFlags = useMemo(() => {
    return supplementFlags.filter(
      (f) => f.alwaysFlag && !gaps.find((g) => g.key === f.nutrientKey)
    );
  }, [supplementFlags, gaps]);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Analysing nutrient gaps…
      </div>
    );
  }

  const noAfcdData = afcdData.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">Gap Analysis</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Nutrients below 70% of your NRV target based on 7-day averages from
          AFCD-sourced foods. Expand each gap to see the best food sources.
          Supplement flags are evidence-based — see a GP before starting
          supplements.
        </p>

        {!biologicalSex && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2 mb-4">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Set your biological sex in Goals → Profile for personalised NRV
            targets.
          </div>
        )}

        {noAfcdData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 mb-4">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            No AFCD foods logged in this date range. Log foods from the
            Australian database to see gap analysis.
          </div>
        )}
      </div>

      {/* Dietary gaps */}
      {gaps.length > 0 ? (
        <div className="space-y-3">
          {gaps.map(({ key, nrv, avg, target, coverage, suppFlag }) => (
            <GapCard
              key={key}
              nutrientKey={key}
              label={nrv.label}
              unit={nrv.unit}
              avg={avg}
              target={target}
              coverage={coverage}
              supplementFlag={suppFlag?.reason}
              alwaysShowSupplement={suppFlag?.alwaysFlag}
            />
          ))}
        </div>
      ) : !noAfcdData ? (
        <div className="text-sm text-green-600 dark:text-green-400 py-4">
          No nutrient gaps detected in this date range. All tracked nutrients
          are above 70% of their NRV target.
        </div>
      ) : null}

      {/* Age-based supplement recommendations not in gap list */}
      {alwaysFlags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Pill className="w-4 h-4 text-orange-500" />
            Age-based supplement considerations
          </h4>
          <div className="space-y-2">
            {alwaysFlags.map((f) => (
              <div
                key={f.nutrientKey}
                className="flex items-start gap-2 text-xs bg-orange-50 dark:bg-orange-950/30 rounded-md px-3 py-2"
              >
                <Pill className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">
                    {nrvRef[f.nutrientKey]?.label ?? f.nutrientKey}:{' '}
                  </span>
                  {f.reason}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            These are shown regardless of dietary intake — discuss with your GP
            before starting supplements.
          </p>
        </div>
      )}
    </div>
  );
}
