import { useEffect } from 'react';

import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

// Chamado uma vez no layout raiz: mantém a sessão do store igual à do Supabase.
export function useAuthListener() {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null));

    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, [setSession]);
}

export function ehEmail(contato: string): boolean {
  return contato.includes('@');
}

// Telefone no formato internacional exigido pelo Supabase: +5549999999999.
export function normalizarTelefone(contato: string): string {
  const digitos = contato.replace(/\D/g, '');

  if (contato.trim().startsWith('+')) return `+${digitos}`;

  return digitos.startsWith('55') && digitos.length > 11
    ? `+${digitos}`
    : `+55${digitos}`;
}

export async function enviarCodigo(contato: string): Promise<string> {
  const destino = ehEmail(contato)
    ? contato.trim().toLowerCase()
    : normalizarTelefone(contato);

  const { error } = ehEmail(destino)
    ? await supabase.auth.signInWithOtp({ email: destino })
    : await supabase.auth.signInWithOtp({ phone: destino });

  if (error) throw error;

  // Guardado no store, e não nos parâmetros da rota, para a tela do código
  // sempre saber o destino.
  useAuthStore.getState().setContatoPendente(destino);

  return destino;
}

export async function confirmarCodigo(contato: string, codigo: string) {
  const { error } = ehEmail(contato)
    ? await supabase.auth.verifyOtp({ email: contato, token: codigo, type: 'email' })
    : await supabase.auth.verifyOtp({ phone: contato, token: codigo, type: 'sms' });

  if (error) throw error;
}

export async function sair() {
  await supabase.auth.signOut();
}

export function useAuth() {
  const session = useAuthStore((state) => state.session);
  const carregando = useAuthStore((state) => state.carregando);

  return {
    user: session?.user ?? null,
    carregando,
    entrar: enviarCodigo,
    sair
  };
}
