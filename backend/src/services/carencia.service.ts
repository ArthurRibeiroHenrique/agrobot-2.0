import { supabaseAdmin } from '../lib/supabase';
import {
  CARENCIA_MAXIMA_DIAS,
  chaveDeTexto,
  deveAparecerNosAlertas,
  diasDeCarenciaValidos,
  escolherSugestao,
  SituacaoDaCarencia,
  situacaoDaCarencia,
  somarDias,
  SugestaoDeCarencia
} from '../rules/carencia';
import { userCanUseField } from './farm.service';
import { accessibleUserIds } from './sharing.service';

export type AlertaDeCarencia = {
  activity_id: string;
  product: string | null;
  field_id: string | null;
  field_name: string | null;
  crop: string | null;
  applied_at: string;
  withholding_days: number | null;
} & SituacaoDaCarencia;

// Ordem da lista: o que ainda não pode colher (o que libera antes primeiro), depois o que
// falta a bula, depois o que já liberou.
const ORDEM = { em_carencia: 0, sem_carencia: 1, liberado: 2 } as const;

function ordenar(a: AlertaDeCarencia, b: AlertaDeCarencia): number {
  if (a.estado !== b.estado) return ORDEM[a.estado] - ORDEM[b.estado];
  if (a.estado === 'em_carencia' && b.estado === 'em_carencia') {
    return a.liberaEm.localeCompare(b.liberaEm);
  }

  return b.applied_at.localeCompare(a.applied_at);
}

// Aplicações do usuário e de quem compartilhou o diário com ele, com a situação da carência.
export async function listarAlertas(userId: string, hoje: string): Promise<AlertaDeCarencia[]> {
  const owners = await accessibleUserIds(userId);

  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('id, product, field_id, field_name, occurred_at, withholding_days')
    .in('user_id', owners)
    .eq('activity_type', 'aplicacao')
    .not('occurred_at', 'is', null)
    // Carência máxima de um ano: aplicações mais antigas não têm como estar em carência.
    .gte('occurred_at', somarDias(hoje, -(CARENCIA_MAXIMA_DIAS + 7)))
    .order('occurred_at', { ascending: false })
    .limit(300);

  if (error) throw error;

  const atividades = data ?? [];
  const fieldIds = [...new Set(atividades.map((a) => a.field_id).filter(Boolean))] as string[];
  const talhoes = new Map<string, { name: string; crop: string | null }>();

  if (fieldIds.length > 0) {
    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('fields')
      .select('id, name, crop')
      .in('id', fieldIds);

    if (fieldsError) throw fieldsError;

    for (const field of fields ?? []) {
      talhoes.set(field.id, { name: field.name, crop: field.crop });
    }
  }

  const alertas: AlertaDeCarencia[] = [];

  for (const atividade of atividades) {
    const aplicadoEm = String(atividade.occurred_at).slice(0, 10);
    const situacao = situacaoDaCarencia(aplicadoEm, atividade.withholding_days, hoje);

    if (!deveAparecerNosAlertas(situacao, aplicadoEm, hoje)) continue;

    const talhao = atividade.field_id ? talhoes.get(atividade.field_id) : undefined;

    alertas.push({
      activity_id: atividade.id,
      product: atividade.product,
      field_id: atividade.field_id,
      field_name: talhao?.name ?? atividade.field_name,
      crop: talhao?.crop ?? null,
      applied_at: aplicadoEm,
      withholding_days: atividade.withholding_days,
      ...situacao
    });
  }

  return alertas.sort(ordenar);
}

async function culturaDoTalhao(fieldId: string | null | undefined): Promise<string> {
  if (!fieldId) return '';

  const { data, error } = await supabaseAdmin
    .from('fields')
    .select('crop')
    .eq('id', fieldId)
    .maybeSingle();

  if (error) throw error;

  return chaveDeTexto(data?.crop);
}

// Número para pré-preencher o campo de carência. O produtor sempre confere na bula.
export async function sugerirCarencia(
  userId: string,
  produto: string,
  fieldId: string | null
): Promise<SugestaoDeCarencia | null> {
  const productKey = chaveDeTexto(produto);

  if (!productKey) return null;

  // Talhão de outra pessoa (sem compartilhamento) não entra: vale como "sem talhão".
  const talhaoPermitido = fieldId ? await userCanUseField(userId, fieldId) : false;
  const cropKey = await culturaDoTalhao(talhaoPermitido ? fieldId : null);

  const { data: memoria, error: memoriaError } = await supabaseAdmin
    .from('withholding_memory')
    .select('days')
    .eq('user_id', userId)
    .eq('product_key', productKey)
    .eq('crop_key', cropKey)
    .maybeSingle();

  if (memoriaError) throw memoriaError;

  // Sem cultura cadastrada, o catálogo não serve: a carência depende da cultura.
  let catalogo = null;

  if (!memoria && cropKey) {
    const { data, error } = await supabaseAdmin
      .from('withholding_catalog')
      .select('days, source, registration_number')
      .eq('product_key', productKey)
      .eq('crop_key', cropKey)
      .maybeSingle();

    if (error) throw error;
    catalogo = data;
  }

  return escolherSugestao(memoria, catalogo);
}

// Guarda o que o produtor leu na bula, para sugerir na próxima aplicação igual.
export async function lembrarCarencia(
  userId: string,
  registros: {
    activity_type?: string | null;
    product?: string | null;
    field_id?: string | null;
    withholding_days?: number | null;
  }[]
): Promise<void> {
  for (const registro of registros) {
    const productKey = chaveDeTexto(registro.product);

    if (
      registro.activity_type !== 'aplicacao' ||
      !productKey ||
      !diasDeCarenciaValidos(registro.withholding_days)
    ) {
      continue;
    }

    const { error } = await supabaseAdmin.from('withholding_memory').upsert({
      user_id: userId,
      product_key: productKey,
      crop_key: await culturaDoTalhao(registro.field_id),
      days: registro.withholding_days,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;
  }
}
