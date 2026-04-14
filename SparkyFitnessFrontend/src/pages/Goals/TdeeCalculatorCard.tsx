import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useMostRecentMeasurement } from '@/hooks/CheckIn/useCheckIn';
import { calculateBmr } from '@/services/bmrService';
import {
  PROTEIN_TARGETS,
  CALORIE_ADJUSTMENTS,
  ACTIVITY_LEVEL_LABELS,
  ACTIVITY_MULTIPLIERS_FULL,
  OLDER_ADULT_AGE_THRESHOLD,
  OLDER_ADULT_PROTEIN_NOTE,
  type GoalMode,
} from '@/constants/bodyCompositionTargets';
import type { ExpandedGoals } from '@/types/goals';

interface Props {
  onApply: (goals: Partial<ExpandedGoals>) => Promise<void>;
}

const GOAL_LABELS: Record<GoalMode, string> = {
  cut: 'Cut (lose fat, preserve muscle)',
  maintain: 'Maintain (body recomposition)',
  bulk: 'Bulk (gain muscle)',
};

const GOAL_COLOURS: Record<GoalMode, string> = {
  cut: 'text-blue-600 dark:text-blue-400',
  maintain: 'text-green-600 dark:text-green-400',
  bulk: 'text-orange-600 dark:text-orange-400',
};

export default function TdeeCalculatorCard({ onApply }: Props) {
  const {
    age,
    biologicalSex,
    activityLevel,
    setActivityLevel,
    bmrAlgorithm,
    weightUnit,
    convertWeight,
  } = usePreferences();

  const [goalMode, setGoalMode] = useState<GoalMode>('maintain');
  const [showSources, setShowSources] = useState(false);
  const [applying, setApplying] = useState(false);

  const { data: weightData } = useMostRecentMeasurement('weight');
  const { data: heightData } = useMostRecentMeasurement('height');

  // Weight is stored in kg regardless of display unit
  const weightKg = weightData?.weight ?? null;
  const heightCm = heightData?.height ?? null;

  const bmr = useMemo(() => {
    if (!weightKg || !heightCm || !age || !biologicalSex) return null;
    const result = calculateBmr(
      bmrAlgorithm,
      weightKg,
      heightCm,
      age,
      biologicalSex
    );
    return result > 0 ? Math.round(result) : null;
  }, [weightKg, heightCm, age, biologicalSex, bmrAlgorithm]);

  const tdee = useMemo(() => {
    if (!bmr) return null;
    const multiplier = ACTIVITY_MULTIPLIERS_FULL[activityLevel] ?? 1.2;
    return Math.round(bmr * multiplier);
  }, [bmr, activityLevel]);

  const calorieTarget = useMemo(() => {
    if (!tdee) return null;
    return tdee + CALORIE_ADJUSTMENTS[goalMode].kcalOffset;
  }, [tdee, goalMode]);

  const proteinTarget = useMemo(() => {
    if (!weightKg) return null;
    const pt = PROTEIN_TARGETS[goalMode];
    // Older adults: use upper end of range
    const gPerKg = age && age >= OLDER_ADULT_AGE_THRESHOLD ? pt.max : pt.target;
    return Math.round(weightKg * gPerKg);
  }, [weightKg, goalMode, age]);

  const isOlderAdult = age != null && age >= OLDER_ADULT_AGE_THRESHOLD;

  const missingFields: string[] = [];
  if (!weightKg) missingFields.push('body weight (log in Check-In)');
  if (!heightCm) missingFields.push('height (log in Check-In)');
  if (!age) missingFields.push('age (set in Profile above)');
  if (!biologicalSex)
    missingFields.push('biological sex (set in Profile above)');

  const canCalculate = missingFields.length === 0;

  const handleApply = async () => {
    if (!calorieTarget || !proteinTarget) return;
    setApplying(true);
    try {
      await onApply({
        calories: calorieTarget,
        protein: proteinTarget,
        protein_percentage: null,
        carbs_percentage: null,
        fat_percentage: null,
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="w-4 h-4" />
          TDEE Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Evidence-based calorie and protein targets from your body
          measurements.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Missing data warning */}
        {!canCalculate && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
            Missing: {missingFields.join(', ')}.
          </div>
        )}

        {/* Goal mode + activity level selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Goal
            </label>
            <Select
              value={goalMode}
              onValueChange={(v) => setGoalMode(v as GoalMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GOAL_LABELS) as GoalMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {GOAL_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Activity level
            </label>
            <Select
              value={activityLevel}
              onValueChange={(v) => setActivityLevel(v as typeof activityLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_LEVEL_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {canCalculate && bmr && tdee && calorieTarget && proteinTarget ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">BMR</div>
                <div className="text-lg font-semibold">{bmr}</div>
                <div className="text-xs text-muted-foreground">kcal/day</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">TDEE</div>
                <div className="text-lg font-semibold">{tdee}</div>
                <div className="text-xs text-muted-foreground">kcal/day</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center border-2 border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">
                  Calorie target
                </div>
                <div className={`text-lg font-bold ${GOAL_COLOURS[goalMode]}`}>
                  {calorieTarget}
                </div>
                <div className="text-xs text-muted-foreground">
                  {CALORIE_ADJUSTMENTS[goalMode].kcalOffset > 0
                    ? `+${CALORIE_ADJUSTMENTS[goalMode].kcalOffset}`
                    : CALORIE_ADJUSTMENTS[goalMode].kcalOffset === 0
                      ? 'at TDEE'
                      : CALORIE_ADJUSTMENTS[goalMode].kcalOffset}{' '}
                  kcal
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center border-2 border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">
                  Protein target
                </div>
                <div className={`text-lg font-bold ${GOAL_COLOURS[goalMode]}`}>
                  {proteinTarget}g
                </div>
                <div className="text-xs text-muted-foreground">
                  {PROTEIN_TARGETS[goalMode].target}g/kg
                  {isOlderAdult ? ' (upper)' : ''}
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div className="text-xs text-muted-foreground bg-muted/20 rounded-md px-3 py-2 space-y-1">
              <p>{CALORIE_ADJUSTMENTS[goalMode].rationale}</p>
              <p>{PROTEIN_TARGETS[goalMode].rationale}</p>
              {isOlderAdult && (
                <p className="text-amber-600 dark:text-amber-400">
                  {OLDER_ADULT_PROTEIN_NOTE}
                </p>
              )}
            </div>

            {/* Data used */}
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>Weight: {weightKg?.toFixed(1)} kg</span>
              <span>Height: {heightCm} cm</span>
              <span>Age: {age}</span>
              <span>Sex: {biologicalSex}</span>
              <span>Algorithm: {bmrAlgorithm}</span>
            </div>

            {/* Sources toggle */}
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3 h-3" />
              Sources
              {showSources ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {showSources && (
              <div className="text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
                <p className="font-medium">Protein ({goalMode}):</p>
                {PROTEIN_TARGETS[goalMode].sources.map((s) => (
                  <p key={s}>• {s}</p>
                ))}
                <p className="font-medium mt-2">Calorie target ({goalMode}):</p>
                {CALORIE_ADJUSTMENTS[goalMode].sources.map((s) => (
                  <p key={s}>• {s}</p>
                ))}
              </div>
            )}

            {/* Apply button */}
            <Button
              onClick={handleApply}
              disabled={applying}
              className="w-full sm:w-auto"
            >
              {applying ? 'Saving…' : "Apply to Today's Goals"}
            </Button>
          </>
        ) : canCalculate ? (
          <p className="text-xs text-muted-foreground">Calculating…</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
