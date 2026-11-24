import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AtividadeCard } from '../../components/cards/AtividadeCard';
import { FiltroDoDiario } from '../../components/diario/FiltroDoDiario';
import { useActivities, useResumo } from '../../hooks/useActivities';
import { cores, TIPOS_DE_ATIVIDADE } from '../../lib/constants';
import { rotuloDoTipo } from '../../lib/format';
import { mensagemDeErro } from '../../services/api';

export default function DiaryScreen() {
  const router = useRouter();
  // O assunto fica no endereço da tela: o resumo abre o diário já filtrado.
  const params = useLocalSearchParams<{ assunto?: string }>();
  const assunto = TIPOS_DE_ATIVIDADE.some((tipo) => tipo.valor === params.assunto)
    ? (params.assunto as string)
    : null;

  const { activities, carregando, trocandoFiltro, atualizando, erro, carregar } =
    useActivities(assunto);
  const { data: resumo, refetch: atualizarResumo } = useResumo();

  const escolherAssunto = (valor: string | null) => router.setParams({ assunto: valor ?? '' });

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
      renderItem={({ item }) => (
        <View style={trocandoFiltro ? styles.esmaecido : undefined}>
          <AtividadeCard atividade={item} />
        </View>
      )}
      refreshing={atualizando}
      onRefresh={() => {
        void atualizarResumo();
        return carregar();
      }}
      ListHeaderComponent={
        <>
          <FiltroDoDiario assunto={assunto} resumo={resumo} onChange={escolherAssunto} />
          {assunto ? (
            <View style={styles.aviso}>
              <Text style={styles.avisoTexto}>
                Mostrando só: <Text style={styles.avisoAssunto}>{rotuloDoTipo(assunto)}</Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver todos os registros"
                onPress={() => escolherAssunto(null)}
                style={({ pressed }) => [styles.verTudo, pressed && styles.esmaecido]}
              >
                <Text style={styles.verTudoTexto}>Ver tudo</Text>
              </Pressable>
            </View>
          ) : null}
          {trocandoFiltro ? (
            <ActivityIndicator color={cores.primaria} style={styles.carregandoFiltro} />
          ) : null}
          {erro ? <Text style={styles.erro}>{mensagemDeErro(erro)}</Text> : null}
        </>
      }
      ListEmptyComponent={
        erro || trocandoFiltro ? undefined : (
          <Text style={styles.vazio}>
            {assunto
              ? `Você ainda não tem nenhum registro de ${rotuloDoTipo(assunto).toLowerCase()}.`
              : 'Seu diário está vazio. Faça o primeiro registro por voz na tela Início.'}
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
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: cores.destaque,
    borderRadius: 12,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    marginBottom: 16
  },
  avisoTexto: {
    flex: 1,
    fontSize: 17,
    color: cores.texto
  },
  avisoAssunto: {
    fontWeight: '800'
  },
  verTudo: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    backgroundColor: cores.cartao
  },
  verTudoTexto: {
    fontSize: 17,
    fontWeight: '700',
    color: cores.primariaEscura
  },
  carregandoFiltro: {
    marginBottom: 12
  },
  esmaecido: {
    opacity: 0.5
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
