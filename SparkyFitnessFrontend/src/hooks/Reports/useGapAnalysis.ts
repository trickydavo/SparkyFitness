import { useQuery } from '@tanstack/react-query';
import { loadTopFoodsForNutrient } from '@/api/Reports/gapAnalysisService';

export function useTopFoodsForNutrient(nutrientKey: string | null) {
  return useQuery({
    queryKey: ['afcd-top-foods', nutrientKey],
    queryFn: () => loadTopFoodsForNutrient(nutrientKey!),
    enabled: !!nutrientKey,
    staleTime: 1000 * 60 * 60, // top foods don't change — cache for 1 hour
  });
}
