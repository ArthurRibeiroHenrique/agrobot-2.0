import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiPatch } from '../services/api';
import type { Activity, ActivityDraft } from '../types';

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

// Abre na hora com o que já veio na lista do diário e confere no servidor.
export function useActivity(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...CHAVE_ATIVIDADES, id],
    queryFn: () => apiGet<Activity>(`/activities/${id}`),
    enabled: Boolean(id),
    initialData: () =>
      queryClient
        .getQueryData<Activity[]>(CHAVE_ATIVIDADES)
        ?.find((atividade) => atividade.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(CHAVE_ATIVIDADES)?.dataUpdatedAt
  });
}

export type AlteracaoDeAtividade = Pick<
  ActivityDraft,
  | 'activity_type'
  | 'product'
  | 'quantity'
  | 'unit'
  | 'field_id'
  | 'field_name'
  | 'occurred_at'
  | 'cost'
>;

export function useUpdateActivity(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alteracao: AlteracaoDeAtividade) =>
      apiPatch<Activity>(`/activities/${id}`, alteracao),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_ATIVIDADES })
  });
}

export function useDeleteActivity(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/activities/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...CHAVE_ATIVIDADES, id], exact: true });
      return queryClient.invalidateQueries({ queryKey: CHAVE_ATIVIDADES, exact: true });
    }
  });
}
