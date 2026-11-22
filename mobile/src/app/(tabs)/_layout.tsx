import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAvisosDeCarencia } from '../../hooks/useAvisosDeCarencia';
import { useSincronizacaoAutomatica } from '../../hooks/useSyncQueue';
import { cores } from '../../lib/constants';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

// Altura da área de toque de cada aba, fora o espaço dos botões do sistema.
const ALTURA_DAS_ABAS = 68;

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
  // Daqui também saem os avisos de carência no celular e o número na aba Alertas.
  const alertasPendentes = useAvisosDeCarencia();

  // Os botões do Android (voltar, início) ficam por cima da parte de baixo da tela. A barra cresce
  // a altura deles, que muda de celular para celular, para as abas nunca ficarem escondidas.
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerTintColor: cores.primariaEscura,
        headerTitleStyle: { fontSize: 20 },
        tabBarActiveTintColor: cores.primariaEscura,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        // Fundo na aba atual: fica claro onde a pessoa está, sem depender só da cor do ícone.
        tabBarActiveBackgroundColor: cores.destaque,
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: 2, marginVertical: 4 },
        tabBarStyle: {
          height: ALTURA_DAS_ABAS + bottom,
          paddingBottom: bottom,
          borderTopWidth: 1,
          borderTopColor: cores.borda
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home') }} />
      <Tabs.Screen name="diary" options={{ title: 'Diário', tabBarIcon: icone('book') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Perguntar', tabBarIcon: icone('chatbubbles') }} />
      <Tabs.Screen name="alerts" options={{
          title: 'Alertas',
          tabBarIcon: icone('notifications'),
          tabBarBadge: alertasPendentes > 0 ? alertasPendentes : undefined,
          tabBarBadgeStyle: { backgroundColor: cores.erro, fontSize: 13, fontWeight: '700' }
        }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icone('person') }} />
    </Tabs>
  );
}
