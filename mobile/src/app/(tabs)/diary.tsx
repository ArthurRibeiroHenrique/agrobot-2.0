import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { AtividadeCard } from '../../components/cards/AtividadeCard';
import { useActivities } from '../../hooks/useActivities';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';

export default function DiaryScreen() {
  const { activities, carregando, atualizando, erro, carregar } = useActivities();

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.lista}
      contentContainerStyle={styles.conteudo}
      data={activities}
      keyExtractor={(atividade) => atividade.id}
      renderItem={({ item }) => <AtividadeCard atividade={item} />}
      refreshing={atualizando}
      onRefresh={carregar}
      ListHeaderComponent={
        erro ? <Text style={styles.erro}>{mensagemDeErro(erro)}</Text> : undefined
      }
      ListEmptyComponent={
        erro ? undefined : (
          <Text style={styles.vazio}>
            Seu diário está vazio. Faça o primeiro registro por voz na tela Início.
          </Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  lista: {
    flex: 1,
    backgroundColor: cores.fundo
  },
  conteudo: {
    padding: 20
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo
  },
  vazio: {
    fontSize: 18,
    lineHeight: 26,
    color: cores.textoSuave,
    textAlign: 'center',
    marginTop: 40
  },
  erro: {
    fontSize: 16,
    color: cores.erro,
    marginBottom: 12
  }
});
