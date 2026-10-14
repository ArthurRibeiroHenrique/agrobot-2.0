import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { sair, useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Tela>
      <Titulo>Meu perfil</Titulo>
      <Paragrafo>{user?.phone || user?.email || ''}</Paragrafo>

      <BotaoGrande
        texto="Minha propriedade e talhões"
        variante="secundario"
        onPress={() => router.push('/farm/setup')}
      />

      <View style={styles.espaco} />

      <BotaoGrande texto="Sair" variante="secundario" onPress={sair} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  espaco: {
    height: 16
  }
});
