import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../services/api';
import type { Activity } from '../types';

export const CHAVE_ATIVIDADES = ['activities'];

export function useActivities() {
  const query = useQuery({
    queryKey: CHAVE_ATIVIDADES,
    queryFn: () => apiGet<Activity[]>('/activities')
  });

  return {
    activities: query.data ?? [],
    carregando: query.isLoading,
    atualizando: query.isRefetching,
    erro: query.error,
    carregar: query.refetch
  };
}
