import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { AlertaCarencia } from '../../components/alerts/AlertaCarencia';
import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { useAlertas } from '../../hooks/useCarencia';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';
import {
  agendarAvisosDeCarencia,
  avisosPermitidos,
  pedirPermissaoDeAvisos
} from '../../services/avisosDeCarencia';
import type { AlertaDeCarencia } from '../../types';

function Secao({
  titulo,
  alertas,
  abrir
}: {
  titulo: string;
  alertas: AlertaDeCarencia[];
  abrir: (alerta: AlertaDeCarencia) => void;
}) {
  if (alertas.length === 0) return null;

  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {alertas.map((alerta) => (
        <AlertaCarencia key={alerta.activity_id} alerta={alerta} onPress={() => abrir(alerta)} />
      ))}
    </View>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const alertas = useAlertas();
  const [avisosLigados, setAvisosLigados] = useState<boolean | null>(null);
  const [avisoNegado, setAvisoNegado] = useState(false);

  // Confere a permissão sempre que a tela aparece (a pessoa pode ter mudado nas configurações).
  useFocusEffect(
    useCallback(() => {
      void avisosPermitidos()
        .then(setAvisosLigados)
        .catch(() => setAvisosLigados(false));
    }, [])
  );

  const lista = alertas.data ?? [];
  const emCarencia = lista.filter((a) => a.estado === 'em_carencia');
  const semCarencia = lista.filter((a) => a.estado === 'sem_carencia');
  const liberados = lista.filter((a) => a.estado === 'liberado');

  function abrir(alerta: AlertaDeCarencia) {
    router.push({ pathname: '/activity/edit', params: { id: alerta.activity_id } });
  }

  async function ligarAvisos() {
    const permitido = await pedirPermissaoDeAvisos();

    setAvisosLigados(permitido);
    setAvisoNegado(!permitido);

    if (permitido && alertas.data) await agendarAvisosDeCarencia(alertas.data);
  }

  if (alertas.isLoading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={alertas.isRefetching}
          onRefresh={() => void alertas.refetch()}
          colors={[cores.primaria]}
        />
      }
    >
      <Text style={styles.titulo}>Carência dos defensivos</Text>
      <Text style={styles.paragrafo}>
        Depois de uma aplicação, o AgroBot mostra até quando não pode colher, pela carência da
        bula.
      </Text>

      {alertas.isError ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erro}>{mensagemDeErro(alertas.error)}</Text>
          <BotaoGrande texto="Tentar de novo" onPress={() => void alertas.refetch()} />
        </View>
      ) : null}

      {avisosLigados === false && emCarencia.length > 0 ? (
        <View style={styles.convite}>
          <Text style={styles.conviteTitulo}>Quer um aviso no dia de colher?</Text>
          <Text style={styles.conviteTexto}>
            O celular avisa às 7h do dia em que a carência terminar, mesmo sem internet.
          </Text>
          {avisoNegado ? (
            <>
              <Text style={styles.conviteTexto}>
                Os avisos estão bloqueados. Libere as notificações do AgroBot nas configurações
                do celular.
              </Text>
              <BotaoGrande
                texto="Abrir configurações"
                variante="secundario"
                onPress={() => void Linking.openSettings()}
              />
            </>
          ) : (
            <BotaoGrande texto="Sim, quero o aviso" onPress={() => void ligarAvisos()} />
          )}
        </View>
      ) : null}

      <Secao titulo="Ainda não pode colher" alertas={emCarencia} abrir={abrir} />
      <Secao titulo="Falta a carência" alertas={semCarencia} abrir={abrir} />
      <Secao titulo="Já pode colher" alertas={liberados} abrir={abrir} />

      {!alertas.isError && lista.length === 0 ? (
        <Text style={styles.vazio}>
          Nenhuma aplicação em carência. Quando você registrar uma aplicação de defensivo com a
          carência da bula, ela aparece aqui.
        </Text>
      ) : null}

      <Text style={styles.nota}>
        A carência vem da bula do produto, informada por você. Em caso de dúvida, fale com o
        técnico agrícola antes de colher.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
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
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: cores.texto,
    marginBottom: 8
  },
  paragrafo: {
    fontSize: 18,
    lineHeight: 26,
    color: cores.textoSuave,
    marginBottom: 16
  },
  secao: {
    marginBottom: 12
  },
  secaoTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: cores.texto,
    marginBottom: 10
  },
  convite: {
    backgroundColor: cores.cartao,
    borderWidth: 2,
    borderColor: cores.primaria,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10
  },
  conviteTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: cores.primariaEscura
  },
  conviteTexto: {
    fontSize: 17,
    lineHeight: 24,
    color: cores.texto
  },
  erroCaixa: {
    marginBottom: 16
  },
  erro: {
    fontSize: 17,
    fontWeight: '600',
    color: cores.erro,
    marginBottom: 12
  },
  vazio: {
    fontSize: 18,
    lineHeight: 26,
    color: cores.textoSuave,
    marginTop: 12
  },
  nota: {
    fontSize: 16,
    lineHeight: 22,
    color: cores.textoSuave,
    marginTop: 20
  }
});
