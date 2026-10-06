import { transcribeAudio } from './transcription.service';
import { extractActivityFromTranscript } from './extraction.service';
import { getVoiceJob, updateVoiceJob } from './voice-job.service';

export async function processVoiceJob(jobId: string): Promise<void> {
  try {
    const job = await getVoiceJob(jobId);

    if (!job) {
      throw new Error('Voice job não encontrado');
    }

    if (!job.audio_path) {
      throw new Error('Caminho do áudio não encontrado');
    }

    const transcript = await transcribeAudio(job.audio_path);

    const draft = await extractActivityFromTranscript(transcript);

    await updateVoiceJob(jobId, {
      status: 'needs_confirmation',
      transcript,
      draft
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    await updateVoiceJob(jobId, {
      status: 'failed',
      error: message
    }).catch(() => {
      console.error('Erro ao atualizar job como failed');
    });
  }
}