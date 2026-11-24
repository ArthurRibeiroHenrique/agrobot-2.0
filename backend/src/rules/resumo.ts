// Resumo do diário para a tela inicial: contas simples, sem IA, sobre todos os registros.
import { chaveDeTexto } from './carencia';

export type RegistroParaResumo = {
  activity_type: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  field_name: string | null;
  occurred_at: string | null;
  cost: number | null;
  currency: string | null;
  created_at: string;
};

export type TotalPorUnidade = { quantidade: number; unidade: string | null };

export type ProdutoNoResumo = {
  produto: string;
  tipo: string;
  vezes: number;
  totais: TotalPorUnidade[];
};

export type Resumo = {
  total: number;
  primeiro_registro: string | null;
  ultimo_registro: string | null;
  este_mes: number;
  por_tipo: { tipo: string; quantidade: number }[];
  produtos: ProdutoNoResumo[];
  talhoes: { talhao: string; quantidade: number }[];
  gastos: { total: number; este_mes: number };
};

// Produtos que o produtor põe na lavoura: o que aparece em "o que você mais usou".
const TIPOS_COM_PRODUTO = new Set(['aplicacao', 'adubacao', 'plantio']);

export const LIMITE_DA_LISTA = 5;

// Mesma unidade escrita de jeitos diferentes conta junto ("litros", "L", "lts").
const UNIDADES: Record<string, string> = {
  l: 'L',
  lt: 'L',
  lts: 'L',
  litro: 'L',
  litros: 'L',
  ml: 'mL',
  kg: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  g: 'g',
  grama: 'g',
  gramas: 'g',
  t: 't',
  ton: 't',
  tonelada: 't',
  toneladas: 't',
  saco: 'sacos',
  sacos: 'sacos',
  sc: 'sacos',
  saca: 'sacas',
  sacas: 'sacas',
  ha: 'ha',
  hectare: 'ha',
  hectares: 'ha'
};

export function unidadePadrao(unidade: string | null | undefined): string | null {
  const chave = chaveDeTexto(unidade);

  if (!chave) return null;

  return UNIDADES[chave] ?? (unidade ?? '').trim();
}

// Texto vazio que às vezes vem da extração ("null", "/null", "não informado") não vira produto
// nem talhão no resumo.
const TEXTOS_VAZIOS = new Set(['null', 'undefined', 'none', 'nenhum', 'nao informado', 'sem talhao']);

export function chaveUtil(texto: string | null | undefined): string {
  const chave = chaveDeTexto(texto);

  return TEXTOS_VAZIOS.has(chave) ? '' : chave;
}

// Data do registro: a do serviço; sem ela, o dia em que foi anotado.
export function dataDoRegistro(registro: Pick<RegistroParaResumo, 'occurred_at' | 'created_at'>) {
  return (registro.occurred_at ?? registro.created_at).slice(0, 10);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function contar<T>(mapa: Map<string, T>, chave: string, criar: () => T): T {
  let item = mapa.get(chave);

  if (!item) {
    item = criar();
    mapa.set(chave, item);
  }

  return item;
}

export function montarResumo(registros: RegistroParaResumo[], hoje: string): Resumo {
  const mesAtual = hoje.slice(0, 7);
  const porTipo = new Map<string, number>();
  const produtos = new Map<
    string,
    { produto: string; tipo: string; vezes: number; ultima: string; totais: Map<string, TotalPorUnidade> }
  >();
  const talhoes = new Map<string, { talhao: string; quantidade: number; ultima: string }>();

  let primeiro: string | null = null;
  let ultimo: string | null = null;
  let esteMes = 0;
  let gastoTotal = 0;
  let gastoMes = 0;

  for (const registro of registros) {
    const data = dataDoRegistro(registro);
    const doMes = data.startsWith(mesAtual);

    if (!primeiro || data < primeiro) primeiro = data;
    if (!ultimo || data > ultimo) ultimo = data;
    if (doMes) esteMes += 1;

    porTipo.set(registro.activity_type, (porTipo.get(registro.activity_type) ?? 0) + 1);

    // Só reais entram na soma; registros sem moeda são do app, que só anota em reais.
    if (registro.cost !== null && (registro.currency ?? 'BRL') === 'BRL') {
      gastoTotal += registro.cost;
      if (doMes) gastoMes += registro.cost;
    }

    const chaveDoProduto = chaveUtil(registro.product);

    if (chaveDoProduto && TIPOS_COM_PRODUTO.has(registro.activity_type)) {
      const item = contar(produtos, `${registro.activity_type}|${chaveDoProduto}`, () => ({
        produto: registro.product!.trim(),
        tipo: registro.activity_type,
        vezes: 0,
        ultima: data,
        totais: new Map<string, TotalPorUnidade>()
      }));

      item.vezes += 1;
      // O nome mostrado é o do registro mais recente.
      if (data >= item.ultima) {
        item.ultima = data;
        item.produto = registro.product!.trim();
      }

      if (registro.quantity !== null && registro.quantity > 0) {
        const unidade = unidadePadrao(registro.unit);
        const total = contar(item.totais, unidade ?? '', () => ({ quantidade: 0, unidade }));

        total.quantidade += registro.quantity;
      }
    }

    const chaveDoTalhao = chaveUtil(registro.field_name);

    if (chaveDoTalhao) {
      const item = contar(talhoes, chaveDoTalhao, () => ({
        talhao: registro.field_name!.trim(),
        quantidade: 0,
        ultima: data
      }));

      item.quantidade += 1;
      if (data >= item.ultima) {
        item.ultima = data;
        item.talhao = registro.field_name!.trim();
      }
    }
  }

  const maisVezes = <T extends { ultima: string }>(
    a: T,
    b: T,
    quantidade: (item: T) => number
  ) => quantidade(b) - quantidade(a) || b.ultima.localeCompare(a.ultima);

  return {
    total: registros.length,
    primeiro_registro: primeiro,
    ultimo_registro: ultimo,
    este_mes: esteMes,
    por_tipo: [...porTipo.entries()]
      .map(([tipo, quantidade]) => ({ tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.tipo.localeCompare(b.tipo)),
    produtos: [...produtos.values()]
      .sort((a, b) => maisVezes(a, b, (item) => item.vezes))
      .slice(0, LIMITE_DA_LISTA)
      .map(({ produto, tipo, vezes, totais }) => ({
        produto,
        tipo,
        vezes,
        totais: [...totais.values()]
          .map((total) => ({ ...total, quantidade: arredondar(total.quantidade) }))
          .sort((a, b) => b.quantidade - a.quantidade)
      })),
    talhoes: [...talhoes.values()]
      .sort((a, b) => maisVezes(a, b, (item) => item.quantidade))
      .slice(0, LIMITE_DA_LISTA)
      .map(({ talhao, quantidade }) => ({ talhao, quantidade })),
    gastos: { total: arredondar(gastoTotal), este_mes: arredondar(gastoMes) }
  };
}
