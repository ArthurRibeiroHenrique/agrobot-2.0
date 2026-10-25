import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthState = {
  session: Session | null;
  carregando: boolean;
  setSession: (session: Session | null) => void;
  // E-mail ou telefone para onde o último código foi enviado.
  contatoPendente: string | null;
  setContatoPendente: (contato: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  carregando: true,
  setSession: (session) => set({ session, carregando: false }),
  contatoPendente: null,
  setContatoPendente: (contatoPendente) => set({ contatoPendente })
}));
