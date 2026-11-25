import {
  AudioQuality,
  RecordingOptions,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

import { pedirPermissaoDeAudio, prepararModoDeGravacao } from '../services/audio';

// Qualidade de voz, não de música: mono, 16 kHz e 32 kbps. O arquivo fica cerca de 4 vezes menor
// que no preset HIGH_QUALITY (estéreo, 44 kHz, 128 kbps), o que poupa o plano de dados do produtor
// e acelera o envio com sinal fraco, sem perder qualidade na transcrição.
const GRAVACAO_DE_VOZ: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  // Nível do som durante a gravação, para perceber quando ninguém falou.
  isMeteringEnabled: true,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    audioQuality: AudioQuality.MEDIUM
  },
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    bitsPerSecond: 32000
  }
};

// Pico de som (dBFS: 0 é o máximo) que conta como alguém falando. Voz perto do celular passa de
// -20; sala em silêncio fica abaixo de -45. O limite é baixo de propósito, para não recusar quem
// fala baixo: só barra a gravação em que nada passou disso do começo ao fim.
export const LIMIAR_DE_VOZ_DB = -40;

export function useVoiceRecording() {
  const recorder = useAudioRecorder(GRAVACAO_DE_VOZ);
  const estado = useAudioRecorderState(recorder, 250);
  // Maior nível de som da gravação atual. null: o celular não informou o nível.
  const pico = useRef<number | null>(null);

  useEffect(() => {
    if (!estado.isRecording || typeof estado.metering !== 'number') return;

    pico.current = pico.current === null ? estado.metering : Math.max(pico.current, estado.metering);
  }, [estado.isRecording, estado.metering]);

  const iniciar = useCallback(async (): Promise<boolean> => {
    const permitido = await pedirPermissaoDeAudio();

    if (!permitido) return false;

    pico.current = null;
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

  // Sem nenhuma medida do nível (celular que não informa), não barra: na dúvida, envia.
  const ouviuVoz = useCallback(
    () => pico.current === null || pico.current >= LIMIAR_DE_VOZ_DB,
    []
  );

  return {
    gravando: estado.isRecording,
    duracaoMs: estado.durationMillis,
    iniciar,
    parar,
    ouviuVoz
  };
}
