import { API_URL } from '../lib/constants';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Sem limite, o fetch espera minutos quando o servidor não responde e a tela
// fica carregando sem explicação.
const TEMPO_LIMITE_MS = 20_000;
// Perguntas ao assistente esperam a resposta da IA.
const TEMPO_LIMITE_POST_MS = 60_000;
// Envio de áudio pode demorar mais em internet lenta.
const TEMPO_LIMITE_UPLOAD_MS = 90_000;

// No plano gratuito, o ngrok pode responder com uma página de aviso em vez da API.
const CABECALHOS_DO_TUNEL: Record<string, string> = API_URL.includes('ngrok')
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {};

async function request<T>(
  path: string,
  init: RequestInit = {},
  tempoLimiteMs = TEMPO_LIMITE_MS
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let response: Response;
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), tempoLimiteMs);

  try {
    response = await fetch(API_URL + path, {
      ...init,
      signal: controle.signal,
      headers: {
        ...CABECALHOS_DO_TUNEL,
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  } catch (erro) {
    if (controle.signal.aborted) {
      throw new ApiError(0, 'O servidor demorou demais para responder. Tente de novo.');
    }

    // A mensagem ao usuário é genérica; o erro real aparece no terminal do Expo.
    if (__DEV__) {
      console.warn(`[api] ${init.method ?? 'GET'} ${API_URL + path} falhou:`, erro);
    }
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet.');
  } finally {
    clearTimeout(timer);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error ?? 'Não foi possível concluir. Tente de novo.'
    );
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, TEMPO_LIMITE_POST_MS);
}

// O fetch define o Content-Type (com o boundary) sozinho para FormData.
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: form
  }, TEMPO_LIMITE_UPLOAD_MS);
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.';
}
