import { useEffect } from 'react';

import { agendarAvisosDeCarencia } from '../services/avisosDeCarencia';
import { useAlertas } from './useCarencia';

// Chamado na área logada: mantém os avisos do celular iguais à lista de alertas e
// devolve quantos pedem atenção (para o número na aba).
export function useAvisosDeCarencia() {
  const { data } = useAlertas();

  useEffect(() => {
    if (data) void agendarAvisosDeCarencia(data).catch(() => {});
  }, [data]);

  return (data ?? []).filter(
    (alerta) => alerta.estado === 'em_carencia' || alerta.estado === 'sem_carencia'
  ).length;
}
