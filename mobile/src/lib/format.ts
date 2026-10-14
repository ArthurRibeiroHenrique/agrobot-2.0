import { TIPOS_DE_ATIVIDADE } from './constants';

// Datas do diário chegam como AAAA-MM-DD. Não passam por `new Date()` porque a
// conversão de fuso mostraria o dia anterior no Brasil.
export function formatarData(data: string | null | undefined): string {
  if (!data) return 'Sem data';

  const [ano, mes, dia] = data.slice(0, 10).split('-');

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

// Aceita "06/10/2026" ou "2026-10-06" e devolve AAAA-MM-DD, ou null se inválida.
export function lerData(texto: string): string | null {
  const limpo = texto.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(limpo);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpo);

  const partes = br
    ? [br[3], br[2].padStart(2, '0'), br[1].padStart(2, '0')]
    : iso
      ? [iso[1], iso[2], iso[3]]
      : null;

  if (!partes) return null;

  const valor = partes.join('-');
  const data = new Date(`${valor}T00:00:00Z`);

  if (Number.isNaN(data.getTime()) || !data.toISOString().startsWith(valor)) {
    return null;
  }

  return valor;
}

export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');

  if (!limpo) return null;

  const numero = Number(limpo);

  return Number.isNaN(numero) ? null : numero;
}

export function formatarNumero(numero: number | null | undefined): string {
  if (numero === null || numero === undefined) return '';

  return String(numero).replace('.', ',');
}

export function rotuloDoTipo(tipo: string | null | undefined): string {
  return (
    TIPOS_DE_ATIVIDADE.find((item) => item.valor === tipo)?.rotulo ?? 'Atividade'
  );
}

export function formatarDinheiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '';

  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}
