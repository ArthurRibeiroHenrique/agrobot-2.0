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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let response: Response;

  try {
    response = await fetch(API_URL + path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  } catch (erro) {
    // A mensagem ao usuário é genérica; o erro real aparece no terminal do Expo.
    if (__DEV__) {
      console.warn(`[api] ${init.method ?? 'GET'} ${API_URL + path} falhou:`, erro);
    }
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet.');
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
  });
}

// O fetch define o Content-Type (com o boundary) sozinho para FormData.
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: form
  });
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.';
}
