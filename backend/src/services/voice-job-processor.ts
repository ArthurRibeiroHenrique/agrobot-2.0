import { transcribeAudio } from './transcription.service';
import { extractActivityFromTranscript } from './extraction.service';
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

    const transcript = await transcribeAudio(job.audio_path);

    await updateVoiceJob(jobId, {
      status: 'extracting',
      transcript
    });

    const draft = await extractActivityFromTranscript(transcript);

    await updateVoiceJob(jobId, {
      status: 'needs_confirmation',
      draft,
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
