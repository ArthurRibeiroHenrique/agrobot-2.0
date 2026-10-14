import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthListener } from '../hooks/useAuth';
import { cores } from '../lib/constants';
import { useAuthStore } from '../store/authStore';

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

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

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
        <Stack.Protected guard={!logado}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={logado}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="activity/new-voice" options={{ title: 'Novo registro' }} />
          <Stack.Screen name="activity/confirm-draft" options={{ title: 'Confira o registro' }} />
          <Stack.Screen name="activity/edit" options={{ title: 'Editar atividade' }} />
          <Stack.Screen name="farm/setup" options={{ title: 'Minha propriedade' }} />
          <Stack.Screen name="farm/fields" options={{ title: 'Talhões' }} />
          <Stack.Screen name="coop/dashboard" options={{ title: 'Cooperativa' }} />
          <Stack.Screen name="settings/index" options={{ title: 'Configurações' }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo
  }
});
