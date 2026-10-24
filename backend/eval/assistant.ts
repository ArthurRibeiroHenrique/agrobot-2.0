import fs from 'fs';
import path from 'path';

import { AssistantReason } from '../src/schemas/assistant.schema';
import { ActivityRef, answerQuestion } from '../src/services/assistant.service';

// Acerto mínimo no encaminhamento ao técnico.
const TARGET_ACCURACY = 0.85;

type AssistantCase = {
  id: string;
  question: string;
  expected: {
    needs_technician: boolean;
    reason?: AssistantReason;
  };
};

// Produtor fictício, igual para todos os casos.
const CONTEXT = {
  today: '2026-10-24',
  fields: [
    { id: 'f1', name: 'Talhão 1', crop: 'soja' },
    { id: 'f2', name: 'Talhão 2', crop: 'milho' },
    { id: 'f3', name: 'Baixada', crop: 'milho' }
  ],
  activities: [
    {
      activity_type: 'aplicacao',
      product: 'glifosato',
      quantity: 20,
      unit: 'L',
      field_name: 'Talhão 2',
      occurred_at: '2026-10-20',
      cost: 450
    },
    {
      activity_type: 'adubacao',
      product: 'ureia',
      quantity: 200,
      unit: 'kg',
      field_name: 'Talhão 2',
      occurred_at: '2026-10-06',
      cost: 780
    },
    {
      activity_type: 'plantio',
      product: 'milho',
      quantity: 3,
      unit: 'sc',
      field_name: 'Baixada',
      occurred_at: '2026-09-15',
      cost: null
    }
  ] satisfies ActivityRef[]
};

async function main() {
  const casesPath = path.resolve(__dirname, process.argv[2] ?? 'assistant-cases.json');
  const cases: AssistantCase[] = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

  let correct = 0;
  // O erro grave: assunto que precisava de técnico e não foi encaminhado.
  const missedReferrals: string[] = [];

  for (const evalCase of cases) {
    const reply = await answerQuestion(evalCase.question, CONTEXT);

    const technicianOk = reply.needs_technician === evalCase.expected.needs_technician;
    const reasonOk =
      evalCase.expected.reason === undefined || reply.reason === evalCase.expected.reason;

    if (technicianOk) correct += 1;

    if (evalCase.expected.needs_technician && !reply.needs_technician) {
      missedReferrals.push(evalCase.id);
    }

    console.log(`${technicianOk ? 'OK  ' : 'ERRO'} ${evalCase.id}`);

    if (!technicianOk) {
      console.log(
        `       needs_technician: esperado ${evalCase.expected.needs_technician}, obtido ${reply.needs_technician}`
      );
    }

    // O motivo é informativo: não entra no acerto, mas ajuda a ajustar o prompt.
    if (!reasonOk) {
      console.log(`       reason: esperado ${evalCase.expected.reason}, obtido ${reply.reason}`);
    }

    console.log(`       resposta: ${reply.answer}`);
  }

  const accuracy = cases.length > 0 ? correct / cases.length : 0;

  console.log(
    `\nEncaminhamento correto: ${(accuracy * 100).toFixed(1)}% (${correct}/${cases.length}) — meta ${TARGET_ACCURACY * 100}%`
  );

  if (missedReferrals.length > 0) {
    console.log(`Encaminhamentos que faltaram (grave): ${missedReferrals.join(', ')}`);
  }

  if (accuracy < TARGET_ACCURACY || missedReferrals.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
