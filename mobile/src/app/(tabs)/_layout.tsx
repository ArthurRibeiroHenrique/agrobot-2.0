import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { useSincronizacaoAutomatica } from '../../hooks/useSyncQueue';
import { cores } from '../../lib/constants';

function icone(simbolo: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{simbolo}</Text>
  );
}

export default function TabsLayout() {
  // As abas ficam montadas em toda a área logada: daqui a fila offline é enviada sozinha.
  useSincronizacaoAutomatica();

  return (
    <Tabs
      screenOptions={{
        headerTintColor: cores.primariaEscura,
        headerTitleStyle: { fontSize: 20 },
        tabBarActiveTintColor: cores.primariaEscura,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { height: 68, paddingTop: 6 }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('🏠') }} />
      <Tabs.Screen name="diary" options={{ title: 'Diário', tabBarIcon: icone('📒') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Perguntar', tabBarIcon: icone('💬') }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alertas', tabBarIcon: icone('🔔') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icone('👤') }} />
    </Tabs>
  );
}
