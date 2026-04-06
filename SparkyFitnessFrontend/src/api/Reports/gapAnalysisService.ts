import { apiCall } from '@/api/api';

export interface TopFood {
  id: string;
  name: string;
  value: number;
  unit: string;
}

export async function loadTopFoodsForNutrient(
  nutrientKey: string,
  limit = 6
): Promise<TopFood[]> {
  return apiCall<TopFood[]>(
    `/afcd-nutrients/top-foods?nutrientKey=${encodeURIComponent(nutrientKey)}&limit=${limit}`
  );
}
