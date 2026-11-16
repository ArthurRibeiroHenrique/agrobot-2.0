import {
  AudioQuality,
  RecordingOptions,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { useCallback } from 'react';

import { pedirPermissaoDeAudio, prepararModoDeGravacao } from '../services/audio';

// Qualidade de voz, não de música: mono, 16 kHz e 32 kbps. O arquivo fica cerca de 4 vezes menor
// que no preset HIGH_QUALITY (estéreo, 44 kHz, 128 kbps), o que poupa o plano de dados do produtor
// e acelera o envio com sinal fraco, sem perder qualidade na transcrição.
const GRAVACAO_DE_VOZ: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    audioQuality: AudioQuality.MEDIUM
  },
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    bitsPerSecond: 32000
  }
};

export function useVoiceRecording() {
  const recorder = useAudioRecorder(GRAVACAO_DE_VOZ);
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
