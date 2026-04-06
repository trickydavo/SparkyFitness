import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info } from 'lucide-react';
import {
  getNrvReference,
  nrvEffectiveTarget,
  nrvCoverage,
  nrvColour,
  nrvTextColour,
  type NrvEntry,
} from '@/constants/nrv';
import type { AfcdNutrientSummary } from '@/api/Reports/micronutrientService';
import type { NutritionData } from '@/types/reports';
import { CENTRAL_NUTRIENT_CONFIG } from '@/constants/nutrients';
import type { ExpandedGoals } from '@/types/goals';

interface Props {
  afcdData: AfcdNutrientSummary[];
  nutritionData: NutritionData[]; // standard 17 from existing reports hook
  goals: ExpandedGoals | undefined;
  isLoading: boolean;
  biologicalSex?: 'male' | 'female' | null;
}

// ─── Standard nutrient row (food_variants data, goals from user_goals) ────────

interface StandardRow {
  id: string;
  label: string;
  unit: string;
  avg: number;
  goal: number | null;
  ul?: number | null;
}

function CoverageBar({
  value,
  target,
  ul,
  unit,
}: {
  value: number;
  target: number | null;
  ul?: number | null;
  unit: string;
}) {
  const pct =
    target && target > 0 ? Math.min((value / target) * 100, 100) : null;
  const overUl = ul && ul > 0 && value > ul;
  const textCol =
    pct === null
      ? 'text-muted-foreground'
      : pct >= 100
        ? 'text-green-600 dark:text-green-400'
        : pct >= 70
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400';
  const barCol =
    pct === null
      ? 'bg-gray-300 dark:bg-gray-600'
      : pct >= 100
        ? 'bg-green-500'
        : pct >= 70
          ? 'bg-amber-400'
          : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      {pct !== null && (
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-0">
          <div
            className={`h-full rounded-full transition-all ${barCol}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <span className={`text-xs font-medium shrink-0 ${textCol}`}>
        {value.toFixed(value < 10 ? 2 : 1)} {unit}
      </span>
      {target !== null && (
        <span className="text-xs text-muted-foreground shrink-0">
          / {target >= 1000 ? `${(target / 1000).toFixed(1)}k` : target} {unit}
        </span>
      )}
      {overUl && (
        <span title={`Over upper limit (${ul} ${unit})`}>
          <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
        </span>
      )}
    </div>
  );
}

function NutrientRow({
  label,
  value,
  target,
  ul,
  unit,
  refType,
}: {
  label: string;
  value: number;
  target: number | null;
  ul?: number | null;
  unit: string;
  refType?: 'goal' | 'rdi' | 'ai';
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-44 shrink-0">
        <span className="text-sm font-medium">{label}</span>
        {refType && refType !== 'goal' && (
          <span className="ml-1 text-xs text-muted-foreground">
            ({refType.toUpperCase()})
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <CoverageBar value={value} target={target} ul={ul} unit={unit} />
      </div>
    </div>
  );
}

function GroupCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MicronutrientPanel({
  afcdData,
  nutritionData,
  goals,
  isLoading,
  biologicalSex = null,
}: Props) {
  const NRV_REFERENCE = getNrvReference(biologicalSex ?? null);
  // ── Standard 17: 7-day average from nutritionData ──
  const standardRows = useMemo<StandardRow[]>(() => {
    if (!nutritionData || nutritionData.length === 0) return [];
    const last7 = nutritionData.slice(-7);
    return Object.values(CENTRAL_NUTRIENT_CONFIG)
      .filter((n) => n.id !== 'calories') // calories shown separately in diary
      .map((n) => {
        const avg =
          last7.reduce((sum, day) => {
            const v = day[n.id as keyof NutritionData];
            return sum + (typeof v === 'number' ? v : 0);
          }, 0) / Math.max(last7.length, 1);
        const goal =
          goals && goals[n.id as keyof ExpandedGoals]
            ? Number(goals[n.id as keyof ExpandedGoals])
            : null;
        return {
          id: n.id,
          label: n.defaultLabel,
          unit: n.unit,
          avg,
          goal: goal || null,
        };
      });
  }, [nutritionData, goals]);

  // ── AFCD extended: nutrients that have NRV reference entries ──
  const afcdByKey = useMemo(() => {
    const m: Record<string, AfcdNutrientSummary> = {};
    for (const n of afcdData) m[n.nutrient_key] = n;
    return m;
  }, [afcdData]);

  // Build extended rows only for NRV_REFERENCE entries
  const extendedRows = useMemo(() => {
    return Object.entries(NRV_REFERENCE).map(([key, nrv]) => {
      const summary = afcdByKey[key];
      const avg = summary?.seven_day_avg ?? 0;
      const target = nrvEffectiveTarget(nrv);
      const coverage = nrvCoverage(avg, nrv);
      return { key, nrv, avg, target, coverage, hasData: !!summary };
    });
  }, [afcdByKey]);

  const vitamins = extendedRows.filter((r) => r.nrv.group === 'vitamins');
  const minerals = extendedRows.filter((r) => r.nrv.group === 'minerals');
  const fattyAcids = extendedRows.filter((r) => r.nrv.group === 'fatty_acids');

  // Group standard rows
  const macroRows = standardRows.filter((r) =>
    ['protein', 'carbs', 'fat', 'dietary_fiber', 'sugars'].includes(r.id)
  );
  const fatRows = standardRows.filter((r) =>
    [
      'saturated_fat',
      'polyunsaturated_fat',
      'monounsaturated_fat',
      'trans_fat',
      'cholesterol',
    ].includes(r.id)
  );
  const mineralRowsStd = standardRows.filter((r) =>
    ['sodium', 'potassium', 'calcium', 'iron'].includes(r.id)
  );
  const vitaminRowsStd = standardRows.filter((r) =>
    ['vitamin_a', 'vitamin_c'].includes(r.id)
  );

  const afcdFoodsLogged = afcdData.length > 0;

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Loading nutrient data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Standard tracked nutrients (food_variants) ── */}
      <div>
        <h3 className="text-base font-semibold mb-3">Tracked Nutrients</h3>
        <p className="text-xs text-muted-foreground mb-4">
          7-day rolling averages from your food diary, compared against your
          goal targets. Set targets in the Goals page.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GroupCard title="Macros">
            {macroRows.map((r) => (
              <NutrientRow
                key={r.id}
                label={r.label}
                value={r.avg}
                target={r.goal}
                unit={r.unit}
                refType="goal"
              />
            ))}
          </GroupCard>
          <GroupCard title="Fats">
            {fatRows.map((r) => (
              <NutrientRow
                key={r.id}
                label={r.label}
                value={r.avg}
                target={r.goal}
                unit={r.unit}
                refType="goal"
              />
            ))}
          </GroupCard>
          <GroupCard title="Key Minerals (tracked)">
            {mineralRowsStd.map((r) => (
              <NutrientRow
                key={r.id}
                label={r.label}
                value={r.avg}
                target={r.goal}
                unit={r.unit}
                refType="goal"
              />
            ))}
          </GroupCard>
          <GroupCard title="Vitamins (tracked)">
            {vitaminRowsStd.map((r) => (
              <NutrientRow
                key={r.id}
                label={r.label}
                value={r.avg}
                target={r.goal}
                unit={r.unit}
                refType="goal"
              />
            ))}
          </GroupCard>
        </div>
      </div>

      {/* ── AFCD extended nutrients ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold">Extended Nutrients</h3>
          <Badge variant="secondary" className="text-xs">
            AFCD
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          7-day averages from AFCD-sourced foods only. Reference targets are
          general Australian adult NRVs (RDI where available, otherwise AI). Not
          personalised to age or sex.
        </p>
        {!afcdFoodsLogged && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 mb-4">
            <Info className="w-3 h-3 shrink-0" />
            No AFCD foods logged in this date range. Log foods from the
            Australian database to see extended nutrient data.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GroupCard title="Vitamins (extended)">
            {vitamins.map(({ key, nrv, avg, target }) => (
              <NutrientRow
                key={key}
                label={nrv.label}
                value={avg}
                target={target}
                ul={nrv.ul}
                unit={nrv.unit}
                refType={nrv.rdi ? 'rdi' : 'ai'}
              />
            ))}
          </GroupCard>
          <GroupCard title="Minerals (extended)">
            {minerals.map(({ key, nrv, avg, target }) => (
              <NutrientRow
                key={key}
                label={nrv.label}
                value={avg}
                target={target}
                ul={nrv.ul}
                unit={nrv.unit}
                refType={nrv.rdi ? 'rdi' : 'ai'}
              />
            ))}
          </GroupCard>
          {fattyAcids.length > 0 && (
            <GroupCard title="Fatty Acids">
              {fattyAcids.map(({ key, nrv, avg, target }) => (
                <NutrientRow
                  key={key}
                  label={nrv.label}
                  value={avg}
                  target={target}
                  ul={nrv.ul}
                  unit={nrv.unit}
                  refType="ai"
                />
              ))}
            </GroupCard>
          )}
        </div>
      </div>
    </div>
  );
}
