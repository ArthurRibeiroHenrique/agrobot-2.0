import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '../services/api';
import type { AssistantMessage } from '../types';

export const CHAVE_PERGUNTAS = ['assistant-messages'];

export function useAssistantMessages() {
  return useQuery({
    queryKey: CHAVE_PERGUNTAS,
    queryFn: () => apiGet<AssistantMessage[]>('/assistant/messages')
  });
}

export function useAskAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (question: string) =>
      apiPost<AssistantMessage>('/assistant/messages', {
        question,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_PERGUNTAS })
  });
}
