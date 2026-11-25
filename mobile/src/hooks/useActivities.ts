import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import { apiDelete, apiGet, apiPatch } from '../services/api';
import { fusoDoAparelho } from '../services/audio';
import type { Activity, ActivityDraft, Resumo } from '../types';
import { CHAVE_ALERTAS } from './useCarencia';

// Tudo que sai do diário fica debaixo de 'activities': ao gravar, editar ou apagar um registro,
// invalidar essa chave atualiza a lista, as listas filtradas e o resumo de uma vez.
export const CHAVE_ATIVIDADES = ['activities'];
const CHAVE_RESUMO = [...CHAVE_ATIVIDADES, 'resumo'];

// Sem assunto, o diário inteiro (mesma chave de antes, usada também na tela inicial).
// Com assunto, só os registros daquele tipo, filtrados no servidor.
export function useActivities(assunto?: string | null) {
  const query = useQuery({
    queryKey: assunto ? [...CHAVE_ATIVIDADES, 'assunto', assunto] : CHAVE_ATIVIDADES,
    queryFn: () =>
      apiGet<Activity[]>(
        assunto ? `/activities?type=${encodeURIComponent(assunto)}` : '/activities'
      ),
    // Ao trocar o filtro, a lista anterior fica na tela até a nova chegar.
    placeholderData: keepPreviousData
  });

  return {
    activities: query.data ?? [],
    carregando: query.isLoading,
    trocandoFiltro: query.isPlaceholderData,
    atualizando: query.isRefetching && !query.isPlaceholderData,
    erro: query.error,
    carregar: query.refetch
  };
}

// Resumo de todo o diário, desde o primeiro registro. "Este mês" no fuso do celular.
export function useResumo() {
  return useQuery({
    queryKey: CHAVE_RESUMO,
    queryFn: () =>
      apiGet<Resumo>(`/summary?timezone=${encodeURIComponent(fusoDoAparelho())}`)
  });
}

// Abre na hora com o que já veio na lista do diário e confere no servidor.
export function useActivity(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...CHAVE_ATIVIDADES, id],
    queryFn: () => apiGet<Activity>(`/activities/${id}`),
    enabled: Boolean(id),
    // Procura na lista do diário e nas listas filtradas que já estão no celular.
    initialData: () => {
      for (const [, dados] of queryClient.getQueriesData<unknown>({ queryKey: CHAVE_ATIVIDADES })) {
        if (!Array.isArray(dados)) continue;

        const achada = (dados as Activity[]).find((atividade) => atividade.id === id);

        if (achada) return achada;
      }

      return undefined;
    },
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
  | 'crop'
  | 'withholding_days'
>;

export function useUpdateActivity(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alteracao: AlteracaoDeAtividade) =>
      apiPatch<Activity>(`/activities/${id}`, alteracao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_ALERTAS });
      return queryClient.invalidateQueries({ queryKey: CHAVE_ATIVIDADES });
    }
  });
}

export function useDeleteActivity(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/activities/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...CHAVE_ATIVIDADES, id], exact: true });
      void queryClient.invalidateQueries({ queryKey: CHAVE_ALERTAS });
      // Atualiza o diário, os filtros e o resumo, mas não busca de novo o registro apagado.
      return queryClient.invalidateQueries({
        queryKey: CHAVE_ATIVIDADES,
        predicate: (query) => query.queryKey[1] !== id
      });
    }
  });
}
