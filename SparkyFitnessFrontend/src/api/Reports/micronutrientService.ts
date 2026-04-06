import { apiCall } from '@/api/api';

export interface AfcdNutrientDaily {
  date: string;
  total: number;
}

export interface AfcdNutrientSummary {
  nutrient_key: string;
  nutrient_label: string;
  unit: string;
  daily_totals: AfcdNutrientDaily[];
  seven_day_avg: number;
}

export const loadAfcdNutrientSummary = async (
  startDate: string,
  endDate: string,
  userId?: string
): Promise<AfcdNutrientSummary[]> => {
  const params = new URLSearchParams({ startDate, endDate });
  if (userId) params.append('userId', userId);
  return apiCall(`/afcd-nutrients/daily-summary?${params.toString()}`, {
    method: 'GET',
  });
};
