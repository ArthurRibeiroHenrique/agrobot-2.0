import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '../services/api';
import type { Activity, ActivityDraft, VoiceJob } from '../types';
import { CHAVE_ATIVIDADES } from './useActivities';
import { CHAVE_PERGUNTAS } from './useAssistant';

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

// Um item por registro revisado: a mesma gravação pode gerar um registro por talhão.
export function useConfirmVoiceJob(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activities: Partial<ActivityDraft>[]) =>
      apiPost<Activity[]>(`/voice-jobs/${id}/confirm`, { activities }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_ATIVIDADES })
  });
}

// A gravação era uma pergunta: pede a resposta usando o que foi falado.
export function useAskVoiceJob(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<VoiceJob>(`/voice-jobs/${id}/ask`, {}),
    onSuccess: (job) => {
      queryClient.setQueryData(['voice-job', id], job);
      queryClient.invalidateQueries({ queryKey: CHAVE_PERGUNTAS });
    }
  });
}
