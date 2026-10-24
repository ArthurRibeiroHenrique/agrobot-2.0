import fs from 'fs';
import path from 'path';

import { buildDraft } from '../src/services/draft.service';
import { extractActivityFromTranscript } from '../src/services/extraction.service';
import { transcribeBuffer } from '../src/services/transcription.service';
import { compareCase, EvalValues, FieldResult, summarize } from './compare';

// Meta da hipótese 2 (docs/08-hipoteses-de-validacao.md).
const TARGET_ACCURACY = 0.85;

type EvalCase = {
  id: string;
  // Um dos dois: transcript testa só a interpretação; audio testa voz + interpretação.
  transcript?: string;
  audio?: string;
  today: string;
  fields?: string[];
  expected: EvalValues;
};

async function main() {
  const casesPath = path.resolve(__dirname, process.argv[2] ?? 'cases.json');
  const cases: EvalCase[] = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

  const allResults: FieldResult[] = [];

  for (const evalCase of cases) {
    const fields = (evalCase.fields ?? []).map((name, index) => ({
      id: `eval-${index}`,
      name,
      crop: null
    }));

    const transcript = evalCase.audio
      ? await transcribeBuffer(
          fs.readFileSync(path.resolve(path.dirname(casesPath), evalCase.audio)),
          path.basename(evalCase.audio)
        )
      : evalCase.transcript ?? '';

    const extraction = await extractActivityFromTranscript(transcript, {
      today: evalCase.today,
      fields
    });

    const draft = buildDraft(extraction, {
      transcript,
      fields,
      today: evalCase.today
    });

    const results = compareCase(evalCase.expected, {
      ...(draft as EvalValues),
      intent: extraction.intent
    });
    const errors = results.filter((result) => !result.correct);

    allResults.push(...results);

    console.log(
      `${errors.length === 0 ? 'OK  ' : 'ERRO'} ${evalCase.id}` +
        (evalCase.audio ? `  (transcrição: "${transcript}")` : '')
    );

    for (const error of errors) {
      console.log(
        `       ${error.field}: esperado ${JSON.stringify(error.expected)}, obtido ${JSON.stringify(error.actual)}`
      );
    }
  }

  const summary = summarize(allResults);

  console.log('\nAcerto por campo');

  for (const row of summary.perField) {
    if (row.accuracy === null) continue;

    console.log(
      `  ${row.field.padEnd(14)} ${(row.accuracy * 100).toFixed(0).padStart(3)}%  (${row.correct}/${row.total})`
    );
  }

  console.log(
    `\nTotal: ${(summary.accuracy * 100).toFixed(1)}% (${summary.correct}/${summary.total}) — meta ${TARGET_ACCURACY * 100}%`
  );

  if (summary.accuracy < TARGET_ACCURACY) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
