import { create } from 'zustand';

// Fila offline persistente fica para a etapa 4; por enquanto só em memória.
type GravacaoPendente = {
  uri: string;
  clientId: string;
};

type OfflineState = {
  pendentes: GravacaoPendente[];
  adicionarPendente: (item: GravacaoPendente) => void;
};

export const useOfflineStore = create<OfflineState>((set) => ({
  pendentes: [],
  adicionarPendente: (item) =>
    set((state) => ({ pendentes: state.pendentes.concat(item) }))
}));
