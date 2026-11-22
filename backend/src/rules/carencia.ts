// Regras de carência (intervalo de segurança) dos defensivos.
// Segurança alimentar: tudo aqui é cálculo fixo, sem IA. Os dias vêm da bula, informados pelo
// produtor, ou do catálogo conferido. Sem esse número, o app pede a bula, nunca chuta.

export const CARENCIA_MAXIMA_DIAS = 365;

// Carências já liberadas continuam na lista por alguns dias, para o produtor ver que liberou.
export const DIAS_MOSTRANDO_LIBERADO = 7;

// Aplicação sem carência informada aparece pedindo a bula enquanto for recente.
export const DIAS_PEDINDO_A_BULA = 60;

// "Glifosato Atar", "glifosato  atar." e "GLIFOSATO ATAR" viram a mesma chave.
export function chaveDeTexto(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Datas no formato AAAA-MM-DD, em UTC para não escorregar um dia por causa do fuso.
export function somarDias(data: string, dias: number): string {
  const base = new Date(`${data}T00:00:00Z`);

  base.setUTCDate(base.getUTCDate() + dias);

  return base.toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string): number {
  const inicio = Date.parse(`${de}T00:00:00Z`);
  const fim = Date.parse(`${ate}T00:00:00Z`);

  return Math.round((fim - inicio) / 86_400_000);
}

export function diasDeCarenciaValidos(dias: unknown): dias is number {
  return (
    typeof dias === 'number' &&
    Number.isInteger(dias) &&
    dias >= 0 &&
    dias <= CARENCIA_MAXIMA_DIAS
  );
}

export type SituacaoDaCarencia =
  // Ainda não pode colher: falta chegar a data de liberação.
  | { estado: 'em_carencia'; liberaEm: string; diasRestantes: number }
  // Já passou a data de liberação.
  | { estado: 'liberado'; liberaEm: string; diasDesdeLiberacao: number }
  // Aplicação sem os dias de carência: o app pede para olhar a bula.
  | { estado: 'sem_carencia' };

// Carência de N dias: a colheita pode ser feita a partir de (data da aplicação + N dias).
export function situacaoDaCarencia(
  aplicadoEm: string,
  diasDeCarencia: number | null | undefined,
  hoje: string
): SituacaoDaCarencia {
  if (!diasDeCarenciaValidos(diasDeCarencia)) {
    return { estado: 'sem_carencia' };
  }

  const liberaEm = somarDias(aplicadoEm, diasDeCarencia);
  const diferenca = diasEntre(hoje, liberaEm);

  return diferenca > 0
    ? { estado: 'em_carencia', liberaEm, diasRestantes: diferenca }
    : { estado: 'liberado', liberaEm, diasDesdeLiberacao: Math.abs(diferenca) };
}

// O que mostrar na lista de alertas.
export function deveAparecerNosAlertas(
  situacao: SituacaoDaCarencia,
  aplicadoEm: string,
  hoje: string
): boolean {
  if (situacao.estado === 'em_carencia') return true;
  if (situacao.estado === 'liberado') {
    return situacao.diasDesdeLiberacao <= DIAS_MOSTRANDO_LIBERADO;
  }

  const idade = diasEntre(aplicadoEm, hoje);

  return idade >= 0 && idade <= DIAS_PEDINDO_A_BULA;
}

export type OrigemDaSugestao = 'bula_anterior' | 'catalogo';

export type SugestaoDeCarencia = {
  dias: number;
  origem: OrigemDaSugestao;
  // Catálogo: de onde veio o número (bula e registro no MAPA).
  referencia: string | null;
};

// Primeiro o que o próprio produtor já leu na bula para o mesmo produto e cultura; depois o
// catálogo conferido. A cultura precisa ser a mesma: a carência muda de uma cultura para outra.
export function escolherSugestao(
  daBulaAnterior: { days: number } | null,
  doCatalogo: { days: number; source: string; registration_number: string | null } | null
): SugestaoDeCarencia | null {
  if (daBulaAnterior && diasDeCarenciaValidos(daBulaAnterior.days)) {
    return { dias: daBulaAnterior.days, origem: 'bula_anterior', referencia: null };
  }

  if (doCatalogo && diasDeCarenciaValidos(doCatalogo.days)) {
    const registro = doCatalogo.registration_number
      ? ` (registro MAPA ${doCatalogo.registration_number})`
      : '';

    return {
      dias: doCatalogo.days,
      origem: 'catalogo',
      referencia: `${doCatalogo.source}${registro}`
    };
  }

  return null;
}
