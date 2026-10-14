import type { ActivityDraft } from '../types';

export function validarAtividade(atividade: Partial<ActivityDraft>): string[] {
  const erros: string[] = [];

  if (atividade.activity_type == null) erros.push('activity_type obrigatorio');
  if (atividade.product == null) erros.push('product obrigatorio');

  return erros;
}
