import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { UltimoRegistroCard } from '../../components/cards/UltimoRegistroCard';
import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useActivities } from '../../hooks/useActivities';
import { mensagemDeErro } from '../../services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { activities, carregando, erro } = useActivities();

  return (
    <Tela>
      <Titulo>O que você fez hoje?</Titulo>
      <Paragrafo>
        Toque no botão e fale. Conte o que fez, como “Passei vinte litros de herbicida no talhão
        dois”, ou tire uma dúvida, como “Quando adubei o talhão dois?”.
      </Paragrafo>

      <BotaoGrande
        texto="Falar com o AgroBot"
        onPress={() => router.push('/activity/new-voice')}
      />

      <View style={styles.espaco} />

      {erro ? <Erro>{mensagemDeErro(erro)}</Erro> : null}
      {!carregando && !erro ? (
        <UltimoRegistroCard atividade={activities[0] ?? null} />
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  espaco: {
    height: 32
  }
});
