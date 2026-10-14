import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '../services/api';
import type { Activity, ActivityDraft, VoiceJob } from '../types';
import { CHAVE_ATIVIDADES } from './useActivities';

const EM_PROCESSAMENTO = ['queued', 'transcribing', 'extracting'];

// Consulta o servidor a cada 2 segundos enquanto a IA ainda está trabalhando.
export function useVoiceJob(id: string | undefined) {
  return useQuery({
    queryKey: ['voice-job', id],
    queryFn: () => apiGet<VoiceJob>(`/voice-jobs/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      !query.state.data || EM_PROCESSAMENTO.includes(query.state.data.status)
        ? 2000
        : false
  });
}

export function useConfirmVoiceJob(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (corrections: Partial<ActivityDraft>) =>
      apiPost<Activity>(`/voice-jobs/${id}/confirm`, { corrections }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_ATIVIDADES })
  });
}
