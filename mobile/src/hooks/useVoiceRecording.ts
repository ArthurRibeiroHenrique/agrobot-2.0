import { RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useCallback } from 'react';

import { pedirPermissaoDeAudio, prepararModoDeGravacao } from '../services/audio';

export function useVoiceRecording() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(recorder, 250);

  const iniciar = useCallback(async (): Promise<boolean> => {
    const permitido = await pedirPermissaoDeAudio();

    if (!permitido) return false;

    await prepararModoDeGravacao();
    await recorder.prepareToRecordAsync();
    recorder.record();

    return true;
  }, [recorder]);

  // Devolve o caminho do arquivo gravado no aparelho.
  const parar = useCallback(async (): Promise<string | null> => {
    await recorder.stop();

    return recorder.uri;
  }, [recorder]);

  return {
    gravando: estado.isRecording,
    duracaoMs: estado.durationMillis,
    iniciar,
    parar
  };
}
