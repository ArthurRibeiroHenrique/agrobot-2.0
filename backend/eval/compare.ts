import { normalizeText, normalizeUnit } from '../src/services/draft.service';

// Campos essenciais da hipótese 2: o que foi feito, com o quê, quanto, onde e quando.
// intent: se a fala era registro, pergunta, os dois ou incerta.
export const EVAL_FIELDS = [
  'intent',
  'activity_type',
  'product',
  'quantity',
  'unit',
  'field_name',
  'occurred_at'
] as const;

export type EvalField = (typeof EVAL_FIELDS)[number];

export type EvalValues = Partial<Record<EvalField, string | number | null>>;

export type FieldResult = {
  field: EvalField;
  expected: string | number | null;
  actual: string | number | null;
  correct: boolean;
};

function sameValue(
  field: EvalField,
  expected: string | number | null,
  actual: string | number | null
): boolean {
  if (expected === null || actual === null) {
    return expected === actual;
  }

  if (field === 'quantity') {
    return Math.abs(Number(expected) - Number(actual)) < 0.001;
  }

  if (field === 'unit') {
    return normalizeUnit(String(expected)) === normalizeUnit(String(actual));
  }

  if (field === 'product') {
    // "Roundup" e "herbicida Roundup" contam como o mesmo produto.
    const a = normalizeText(String(expected));
    const b = normalizeText(String(actual));

    return a === b || a.includes(b) || b.includes(a);
  }

  return normalizeText(String(expected)) === normalizeText(String(actual));
}

// Só os campos presentes em `expected` são avaliados.
export function compareCase(
  expected: EvalValues,
  actual: EvalValues
): FieldResult[] {
  return EVAL_FIELDS.filter((field) => field in expected).map((field) => {
    const expectedValue = expected[field] ?? null;
    const actualValue = actual[field] ?? null;

    return {
      field,
      expected: expectedValue,
      actual: actualValue,
      correct: sameValue(field, expectedValue, actualValue)
    };
  });
}

export function summarize(results: FieldResult[]) {
  const perField = EVAL_FIELDS.map((field) => {
    const ofField = results.filter((result) => result.field === field);
    const correct = ofField.filter((result) => result.correct).length;

    return {
      field,
      correct,
      total: ofField.length,
      accuracy: ofField.length > 0 ? correct / ofField.length : null
    };
  });

  const correct = results.filter((result) => result.correct).length;

  return {
    perField,
    correct,
    total: results.length,
    accuracy: results.length > 0 ? correct / results.length : 0
  };
}
