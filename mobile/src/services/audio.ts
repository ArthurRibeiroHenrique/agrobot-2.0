import { randomUUID } from 'expo-crypto';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync
} from 'expo-audio';
import { File } from 'expo-file-system';

import type { VoiceJob } from '../types';
import { apiUpload } from './api';

export async function pedirPermissaoDeAudio(): Promise<boolean> {
  const atual = await getRecordingPermissionsAsync();

  if (atual.granted) return true;

  const permissao = await requestRecordingPermissionsAsync();

  return permissao.granted;
}

export async function prepararModoDeGravacao(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true
  });
}

export function novoClientId(): string {
  return randomUUID();
}

// O client_id identifica a gravação: reenviar a mesma não cria outro registro.
export function enviarGravacao(input: {
  uri: string;
  clientId: string;
  fieldId?: string | null;
}): Promise<VoiceJob> {
  const form = new FormData();

  // O fetch do Expo não aceita o formato { uri, name, type } do React Native:
  // o arquivo precisa ir como File do expo-file-system, que já traz nome e tipo.
  form.append('audio', new File(input.uri) as unknown as Blob);
  form.append('client_id', input.clientId);
  form.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

  if (input.fieldId) {
    form.append('field_id', input.fieldId);
  }

  return apiUpload<VoiceJob>('/voice-jobs', form);
}
