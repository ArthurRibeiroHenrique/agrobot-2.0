import { Stack } from 'expo-router';

import { cores } from '../../lib/constants';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: cores.primariaEscura,
        contentStyle: { backgroundColor: cores.fundo }
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="otp" options={{ title: 'Código de acesso' }} />
    </Stack>
  );
}
