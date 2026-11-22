import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// aguardando: guardada no celular, ainda não chegou ao servidor (sem sinal ou servidor fora).
// recusada: o servidor respondeu que não aceita o áudio; tentar de novo não adianta.
// enviada: o servidor recebeu; falta o produtor conferir o rascunho.
export type EstadoDaGravacao = 'aguardando' | 'recusada' | 'enviada';

export type GravacaoNaFila = {
  clientId: string;
  // A fila é do aparelho: cada pessoa só vê e envia as próprias gravações.
  userId: string;
  // Cópia do áudio na pasta de documentos, que o sistema não apaga sozinho.
  uri: string;
  // Momento da gravação, para "hoje" e "ontem" na fala valerem pelo dia em que foi gravada.
  gravadaEm: string;
  timezone: string;
  estado: EstadoDaGravacao;
  tentativas: number;
  erro: string | null;
  jobId: string | null;
};

type OfflineState = {
  itens: GravacaoNaFila[];
  adicionar: (item: GravacaoNaFila) => void;
  atualizar: (clientId: string, campos: Partial<GravacaoNaFila>) => void;
  remover: (clientId: string) => void;
  removerPorJob: (jobId: string) => void;
  removerDoUsuario: (userId: string) => void;
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      itens: [],
      adicionar: (item) => set((state) => ({ itens: state.itens.concat(item) })),
      atualizar: (clientId, campos) =>
        set((state) => ({
          itens: state.itens.map((item) =>
            item.clientId === clientId ? { ...item, ...campos } : item
          )
        })),
      remover: (clientId) =>
        set((state) => ({ itens: state.itens.filter((item) => item.clientId !== clientId) })),
      removerPorJob: (jobId) =>
        set((state) => ({ itens: state.itens.filter((item) => item.jobId !== jobId) })),
      removerDoUsuario: (userId) =>
        set((state) => ({ itens: state.itens.filter((item) => item.userId !== userId) }))
    }),
    {
      name: 'agrobot-fila-de-gravacoes',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ itens: state.itens })
    }
  )
);

// A fila é lida do AsyncStorage de forma assíncrona ao abrir o app; antes disso parece vazia.
export function esperarFilaCarregada(): Promise<void> {
  if (useOfflineStore.persist.hasHydrated()) return Promise.resolve();

  return new Promise((resolve) => {
    const cancelar = useOfflineStore.persist.onFinishHydration(() => {
      cancelar();
      resolve();
    });
  });
}
