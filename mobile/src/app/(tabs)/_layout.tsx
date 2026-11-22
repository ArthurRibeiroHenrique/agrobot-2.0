import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useSincronizacaoAutomatica } from '../../hooks/useSyncQueue';
import { cores } from '../../lib/constants';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

// Aba ativa com o ícone cheio; as outras, só com o contorno.
function icone(nome: string) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons
      name={(focused ? nome : `${nome}-outline`) as NomeDoIcone}
      size={28}
      color={color as string}
    />
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
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        tabBarStyle: { height: 72, paddingTop: 6, borderTopWidth: 1, borderTopColor: cores.borda }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home') }} />
      <Tabs.Screen name="diary" options={{ title: 'Diário', tabBarIcon: icone('book') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Perguntar', tabBarIcon: icone('chatbubbles') }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alertas', tabBarIcon: icone('notifications') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icone('person') }} />
    </Tabs>
  );
}
