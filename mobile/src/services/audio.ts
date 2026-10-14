import { randomUUID } from 'expo-crypto';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync
} from 'expo-audio';

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

function tipoDoArquivo(uri: string): { nome: string; tipo: string } {
  const extensao = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
  const tipos: Record<string, string> = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    caf: 'audio/x-caf',
    wav: 'audio/wav',
    webm: 'audio/webm',
    '3gp': 'audio/3gpp'
  };

  return {
    nome: `gravacao.${extensao}`,
    tipo: tipos[extensao] ?? 'application/octet-stream'
  };
}

// O client_id identifica a gravação: reenviar a mesma não cria outro registro.
export function enviarGravacao(input: {
  uri: string;
  clientId: string;
  fieldId?: string | null;
}): Promise<VoiceJob> {
  const { nome, tipo } = tipoDoArquivo(input.uri);
  const form = new FormData();

  // No React Native, um arquivo em FormData é descrito por { uri, name, type }.
  form.append('audio', { uri: input.uri, name: nome, type: tipo } as unknown as Blob);
  form.append('client_id', input.clientId);
  form.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

  if (input.fieldId) {
    form.append('field_id', input.fieldId);
  }

  return apiUpload<VoiceJob>('/voice-jobs', form);
}
