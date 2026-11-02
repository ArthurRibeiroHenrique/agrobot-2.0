import {
  ActivityDraft,
  ActivityType,
  ExtractedActivity,
  Extraction,
  isValidDateString
} from '../schemas/activity.schema';
import { FieldRef } from './farm.service';

const UNIT_ALIASES: Record<string, string> = {
  kg: 'kg',
  kgs: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  quilograma: 'kg',
  quilogramas: 'kg',
  g: 'g',
  grama: 'g',
  gramas: 'g',
  t: 't',
  ton: 't',
  tonelada: 't',
  toneladas: 't',
  l: 'L',
  lt: 'L',
  litro: 'L',
  litros: 'L',
  ml: 'mL',
  mililitro: 'mL',
  mililitros: 'mL',
  sc: 'sc',
  saco: 'sc',
  sacos: 'sc',
  saca: 'sc',
  sacas: 'sc',
  ha: 'ha',
  hectare: 'ha',
  hectares: 'ha',
  un: 'un',
  unidade: 'un',
  unidades: 'un'
};

// Campos sem os quais o registro de cada tipo não serve para o diário.
const REQUIRED_FIELDS: Record<ActivityType, string[]> = {
  plantio: ['product', 'field_name'],
  aplicacao: ['product', 'quantity', 'unit', 'field_name'],
  adubacao: ['product', 'quantity', 'unit', 'field_name'],
  irrigacao: ['field_name'],
  colheita: ['quantity', 'unit', 'field_name'],
  manejo: ['field_name'],
  custo: ['cost'],
  outro: []
};

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;

  const key = normalizeText(unit).replace(/\s+/g, '');

  return UNIT_ALIASES[key] ?? unit.trim();
}

// Palavras que não dizem qual foi o insumo: o produto fica em falta para o produtor preencher.
const VAGUE_PRODUCTS = new Set([
  'produto',
  'produtos',
  'coisa',
  'negocio',
  'trem',
  'insumo'
]);

const ARTICLES = new Set(['um', 'uma', 'o', 'a', 'aquele', 'aquela', 'esse', 'essa']);

export function cleanProduct(product: string | null): string | null {
  const trimmed = product?.trim();

  if (!trimmed) return null;

  const words = normalizeText(trimmed)
    .split(' ')
    .filter((word) => !ARTICLES.has(word));

  return words.length === 1 && VAGUE_PRODUCTS.has(words[0]) ? null : trimmed;
}

const SPOKEN_NUMBERS: Record<string, string> = {
  um: '1',
  dois: '2',
  tres: '3',
  quatro: '4',
  cinco: '5',
  seis: '6',
  sete: '7',
  oito: '8',
  nove: '9',
  dez: '10'
};

// Faz "talhão 2", "talhao dois" e "2" acharem o talhão cadastrado como "Talhão 2".
function fieldKey(name: string): string {
  return normalizeText(name)
    .split(' ')
    .filter((word) => word !== 'talhao' && word !== 'area' && word !== 'lote')
    .map((word) => SPOKEN_NUMBERS[word] ?? word)
    .join(' ');
}

export function matchField(
  spokenName: string | null,
  fields: FieldRef[]
): FieldRef | null {
  if (!spokenName) return null;

  const key = fieldKey(spokenName);

  if (!key) return null;

  const matches = fields.filter((field) => fieldKey(field.name) === key);

  // Mais de um talhão com o mesmo nome: não adivinha, deixa o produtor escolher.
  return matches.length === 1 ? matches[0] : null;
}

export function todayInTimezone(
  timezone: string | null,
  now = new Date()
): string {
  const format = (timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

  try {
    return format(timezone || 'America/Sao_Paulo');
  } catch {
    return format('America/Sao_Paulo');
  }
}

export function emptyDraft(transcript: string, today: string): ActivityDraft {
  return {
    activity_type: 'outro',
    product: null,
    quantity: null,
    unit: null,
    field_id: null,
    field_name: null,
    occurred_at: today,
    cost: null,
    currency: null,
    confidence: 0,
    missing_fields: ['activity_type'],
    raw_transcript: transcript
  };
}

export type DraftContext = {
  transcript: string;
  fields: FieldRef[];
  today: string;
  confidence: number;
  preselectedFieldId?: string | null;
};

// Pergunta, ou fala sem atividade: o rascunho fica em branco caso o produtor queira anotar.
const BLANK_ACTIVITY: ExtractedActivity = {
  activity_type: 'outro',
  product: null,
  quantity: null,
  unit: null,
  field_name: null,
  occurred_at: null,
  cost: null,
  currency: null
};

export function buildDraft(
  activity: ExtractedActivity,
  context: DraftContext
): ActivityDraft {
  const preselected =
    context.fields.find((field) => field.id === context.preselectedFieldId) ??
    null;

  const field = matchField(activity.field_name, context.fields) ?? preselected;

  // Data não dita, inválida ou no futuro: assume hoje. O produtor revisa na confirmação.
  const occurredAt =
    activity.occurred_at &&
    isValidDateString(activity.occurred_at) &&
    activity.occurred_at <= context.today
      ? activity.occurred_at
      : context.today;

  const draft: ActivityDraft = {
    activity_type: activity.activity_type,
    product: cleanProduct(activity.product),
    // A IA às vezes devolve 0 ou "" para o que não foi dito.
    quantity: activity.quantity || null,
    unit: normalizeUnit(activity.unit),
    field_id: field?.id ?? null,
    field_name: field?.name ?? (activity.field_name?.trim() || null),
    occurred_at: occurredAt,
    cost: activity.cost,
    currency: activity.cost !== null ? activity.currency || 'BRL' : null,
    confidence: Math.min(1, Math.max(0, context.confidence)),
    raw_transcript: context.transcript
  };

  const missing = REQUIRED_FIELDS[activity.activity_type].filter(
    (name) => draft[name] === null || draft[name] === undefined
  );

  // Talhão dito mas não cadastrado: o nome fica no registro e o vínculo é pedido.
  if (context.fields.length > 0 && draft.field_name && !draft.field_id) {
    missing.push('field_id');
  }

  draft.missing_fields = missing;

  return draft;
}

// Um rascunho por atividade relatada (ex.: um por talhão). Sempre devolve ao menos um.
export function buildDrafts(
  extraction: Extraction,
  context: Omit<DraftContext, 'confidence'>
): ActivityDraft[] {
  const activities =
    extraction.activities.length > 0 ? extraction.activities : [BLANK_ACTIVITY];

  return activities.map((activity) =>
    buildDraft(activity, { ...context, confidence: extraction.confidence })
  );
}
