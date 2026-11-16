import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiPost } from '../services/api';
import type { SharePerson, Shares } from '../types';

const CHAVE_COMPARTILHAMENTOS = ['shares'];

// Compartilhar muda o que aparece no diário, na propriedade e nos talhões.
function recarregarTudo(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries();
}

export function useShares() {
  return useQuery({
    queryKey: CHAVE_COMPARTILHAMENTOS,
    queryFn: () => apiGet<Shares>('/shares')
  });
}

export function useShareDiary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => apiPost<SharePerson>('/shares', { email }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAVE_COMPARTILHAMENTOS })
  });
}

export function useStopSharing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => apiDelete(`/shares/${memberId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAVE_COMPARTILHAMENTOS })
  });
}

export function useLeaveSharedDiary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ownerId: string) => apiDelete(`/shares/received/${ownerId}`),
    onSuccess: () => recarregarTudo(queryClient)
  });
}
