import { supabaseAdmin } from '../lib/supabase';
import { montarResumo, RegistroParaResumo, Resumo } from '../rules/resumo';
import { accessibleUserIds } from './sharing.service';

// O Supabase devolve no máximo mil linhas por consulta; o resumo lê o diário inteiro em páginas.
const TAMANHO_DA_PAGINA = 1000;
// Trava de segurança: um diário real fica muito abaixo disso.
const LIMITE_DE_REGISTROS = 20000;

// Resumo de todo o diário do usuário e de quem compartilhou o diário com ele, desde o primeiro
// registro. É o mesmo conjunto de registros que aparece na aba Diário.
export async function montarResumoDoDiario(userId: string, hoje: string): Promise<Resumo> {
  const owners = await accessibleUserIds(userId);
  const registros: RegistroParaResumo[] = [];

  for (let inicio = 0; inicio < LIMITE_DE_REGISTROS; inicio += TAMANHO_DA_PAGINA) {
    const { data, error } = await supabaseAdmin
      .from('activities')
      .select(
        'activity_type, product, quantity, unit, field_name, occurred_at, cost, currency, created_at'
      )
      .in('user_id', owners)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + TAMANHO_DA_PAGINA - 1);

    if (error) throw error;

    const pagina = (data ?? []) as RegistroParaResumo[];

    registros.push(...pagina);

    if (pagina.length < TAMANHO_DA_PAGINA) break;
  }

  return montarResumo(registros, hoje);
}
