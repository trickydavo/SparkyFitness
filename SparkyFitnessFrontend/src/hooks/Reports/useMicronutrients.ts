import { useQuery } from '@tanstack/react-query';
import { micronutrientKeys } from '@/api/keys/reports';
import { loadAfcdNutrientSummary } from '@/api/Reports/micronutrientService';

export const useAfcdNutrientSummary = (
  startDate: string,
  endDate: string,
  userId: string | null
) => {
  return useQuery({
    queryKey: micronutrientKeys.dailySummary(
      startDate,
      endDate,
      userId ?? undefined
    ),
    queryFn: () =>
      loadAfcdNutrientSummary(startDate, endDate, userId ?? undefined),
    enabled: Boolean(startDate && endDate && userId),
  });
};
