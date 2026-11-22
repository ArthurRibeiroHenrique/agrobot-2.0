import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiGet } from '../services/api';
import { fusoDoAparelho } from '../services/audio';
import type { AlertaDeCarencia, SugestaoDeCarencia } from '../types';

export const CHAVE_ALERTAS = ['alerts'];

export function useAlertas() {
  return useQuery({
    queryKey: CHAVE_ALERTAS,
    queryFn: () =>
      apiGet<AlertaDeCarencia[]>(`/alerts?timezone=${encodeURIComponent(fusoDoAparelho())}`)
  });
}

// Espera a pessoa parar de digitar antes de consultar.
function useValorAtrasado<T>(valor: T, atrasoMs: number): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setAtrasado(valor), atrasoMs);

    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);

  return atrasado;
}

// Dias de carência já conhecidos para o produto no talhão (bula lida antes ou catálogo).
export function useSugestaoDeCarencia(
  produto: string,
  talhaoId: string | null,
  ativo: boolean
) {
  const nome = useValorAtrasado(produto.trim(), 600);
  const params = new URLSearchParams({ product: nome });

  if (talhaoId) params.set('field_id', talhaoId);

  return useQuery({
    queryKey: ['withholding-suggestion', nome.toLowerCase(), talhaoId],
    queryFn: () =>
      apiGet<SugestaoDeCarencia | null>(`/withholding/suggestion?${params.toString()}`),
    enabled: ativo && nome.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}
