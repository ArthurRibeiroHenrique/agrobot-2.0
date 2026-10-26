import { ActivityDraft, Intent } from '../schemas/activity.schema';
import { askFromVoice, VoiceAnswer } from './assistant.service';
import { transcribeAudio } from './transcription.service';
import { extractActivityFromTranscript } from './extraction.service';
import { buildDraft, emptyDraft, todayInTimezone } from './draft.service';
import { listFields } from './farm.service';
import { findVoiceJobById, updateVoiceJob } from './voice-job.service';

const PROCESSABLE_STATUSES = ['queued', 'transcribing', 'extracting'];

export async function processVoiceJob(
  jobId: string,
  options: { isLastAttempt: boolean }
): Promise<void> {
  const job = await findVoiceJobById(jobId);

  // Registro apagado ou já processado: não há o que repetir.
  if (!job || !PROCESSABLE_STATUSES.includes(job.status)) {
    return;
  }

  try {
    if (!job.audio_path) {
      throw new Error('Caminho do áudio não encontrado');
    }

    await updateVoiceJob(jobId, {
      status: 'transcribing',
      attempts: (job.attempts ?? 0) + 1
    });

    // Os nomes dos talhões ajudam a transcrição e depois a interpretação.
    const fields = job.user_id ? await listFields(job.user_id) : [];
    const transcript = (
      await transcribeAudio(
        job.audio_path,
        fields.map((field) => field.name)
      )
    ).trim();

    await updateVoiceJob(jobId, {
      status: 'extracting',
      transcript
    });

    const metadata = (job.metadata ?? {}) as Record<string, unknown>;
    const today = todayInTimezone(
      typeof metadata.timezone === 'string' ? metadata.timezone : null
    );

    let draft: ActivityDraft;
    let intent: Intent = 'registro';
    let answer: VoiceAnswer | null = null;

    if (!transcript) {
      // Áudio sem fala: não há o que interpretar.
      draft = emptyDraft(transcript, today);
    } else {
      const extraction = await extractActivityFromTranscript(transcript, {
        today,
        fields
      });

      draft = buildDraft(extraction, {
        transcript,
        fields,
        today,
        preselectedFieldId:
          typeof metadata.field_id === 'string' ? metadata.field_id : null
      });

      // Registros antigos sem dono não têm histórico para o assistente consultar.
      intent = job.user_id ? extraction.intent : 'registro';

      if (job.user_id && (intent === 'pergunta' || intent === 'ambos')) {
        answer = await askFromVoice({
          userId: job.user_id,
          voiceJobId: jobId,
          question: extraction.question?.trim() || transcript,
          timezone: typeof metadata.timezone === 'string' ? metadata.timezone : null,
          // A atividade relatada junto ainda não está no diário: vai como contexto.
          pendingReport: intent === 'ambos' ? transcript : null
        });
      }
    }

    // Só pergunta: já está respondida. Registro, ambos ou incerto: o produtor confere.
    await updateVoiceJob(jobId, {
      status: intent === 'pergunta' ? 'answered' : 'needs_confirmation',
      intent,
      draft,
      answer,
      error: null
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    await updateVoiceJob(jobId, {
      status: options.isLastAttempt ? 'failed' : 'queued',
      error: message
    }).catch(() => {
      console.error('Erro ao registrar falha do voice job');
    });

    // Relança para a fila agendar a próxima tentativa.
    throw error;
  }
}
