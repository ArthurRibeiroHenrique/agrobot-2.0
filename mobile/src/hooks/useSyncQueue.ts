import { addNetworkStateListener } from 'expo-network';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { sincronizarFila } from '../services/filaOffline';
import { useAuthStore } from '../store/authStore';
import { useOfflineStore } from '../store/offlineStore';

// Sinal fraco no campo nem sempre gera evento de rede: tenta de novo de tempos em tempos.
const INTERVALO_DE_TENTATIVA_MS = 60_000;

// Chamado uma vez na área logada: envia a fila ao abrir o app, ao voltar para ele,
// quando a internet volta e periodicamente enquanto houver gravação aguardando.
export function useSincronizacaoAutomatica() {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const temAguardando = useOfflineStore((state) =>
    state.itens.some((item) => item.userId === userId && item.estado === 'aguardando')
  );

  useEffect(() => {
    if (!userId) return;

    void sincronizarFila();

    const rede = addNetworkStateListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false) {
        void sincronizarFila();
      }
    });

    const app = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void sincronizarFila();
    });

    return () => {
      rede.remove();
      app.remove();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !temAguardando) return;

    const timer = setInterval(() => void sincronizarFila(), INTERVALO_DE_TENTATIVA_MS);

    return () => clearInterval(timer);
  }, [userId, temAguardando]);
}

// Gravações da pessoa logada, separadas pelo que falta fazer com cada uma.
export function useSyncQueue() {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const itens = useOfflineStore(
    useShallow((state) => state.itens.filter((item) => item.userId === userId))
  );
  const [sincronizando, setSincronizando] = useState(false);

  const grupos = useMemo(
    () => ({
      aguardando: itens.filter((item) => item.estado === 'aguardando'),
      recusadas: itens.filter((item) => item.estado === 'recusada'),
      paraConferir: itens.filter((item) => item.estado === 'enviada')
    }),
    [itens]
  );

  const sincronizar = useCallback(async () => {
    setSincronizando(true);

    try {
      return await sincronizarFila();
    } finally {
      setSincronizando(false);
    }
  }, []);

  return { ...grupos, sincronizando, sincronizar };
}
