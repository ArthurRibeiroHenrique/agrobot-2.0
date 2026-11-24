import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { preventAutoHideAsync, hideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuthListener } from '../hooks/useAuth';
import { cores } from '../lib/constants';
import { useAuthStore } from '../store/authStore';

// A tela de abertura fica até a sessão salva ser lida: sem piscar a tela de login para quem já entrou.
void preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 } }
      })
  );

  useAuthListener();

  const session = useAuthStore((state) => state.session);
  const carregando = useAuthStore((state) => state.carregando);

  useEffect(() => {
    if (!carregando) void hideAsync().catch(() => {});
  }, [carregando]);

  if (carregando) return null;

  const logado = session !== null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: cores.primariaEscura,
          headerTitleStyle: { fontSize: 20 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: cores.fundo }
        }}
      >
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />

        <Stack.Protected guard={!logado}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={logado}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="activity/new-voice" options={{ title: 'Falar com o AgroBot' }} />
          <Stack.Screen name="activity/confirm-draft" options={{ title: 'Confira' }} />
          <Stack.Screen name="activity/edit" options={{ title: 'Detalhes do registro' }} />
          <Stack.Screen name="farm/setup" options={{ title: 'Minha propriedade' }} />
          <Stack.Screen name="farm/fields" options={{ title: 'Talhões' }} />
          <Stack.Screen name="coop/dashboard" options={{ title: 'Cooperativa' }} />
          <Stack.Screen name="share/index" options={{ title: 'Compartilhar diário' }} />
          <Stack.Screen name="settings/index" options={{ title: 'Configurações' }} />
          <Stack.Screen name="resumo" options={{ title: 'Resumo da sua roça' }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
