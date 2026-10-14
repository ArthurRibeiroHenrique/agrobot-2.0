import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '../services/api';
import type { Farm, Field } from '../types';

const CHAVE_PROPRIEDADES = ['farms'];
const CHAVE_TALHOES = ['fields'];

export function useFarms() {
  return useQuery({
    queryKey: CHAVE_PROPRIEDADES,
    queryFn: () => apiGet<Farm[]>('/farms')
  });
}

export function useFields() {
  return useQuery({
    queryKey: CHAVE_TALHOES,
    queryFn: () => apiGet<Field[]>('/fields')
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; city?: string; state?: string }) =>
      apiPost<Farm>('/farms', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_PROPRIEDADES })
  });
}

export function useCreateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      farm_id: string;
      name: string;
      crop?: string;
      area_ha?: number | null;
    }) => apiPost<Field>('/fields', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_TALHOES })
  });
}
