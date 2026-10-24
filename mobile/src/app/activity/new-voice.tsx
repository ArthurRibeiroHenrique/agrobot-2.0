import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Erro, Tela } from '../../components/ui/Tela';
import { GravadorVoz } from '../../components/voice/GravadorVoz';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';
import {
  enviarGravacao,
  escolherArquivoDeAudio,
  novoClientId
} from '../../services/audio';

// Gravações mais curtas que isso quase sempre são toque acidental.
const DURACAO_MINIMA_MS = 1000;

type Pendente = {
  uri: string;
  clientId: string;
};

export default function NewVoiceScreen() {
  const router = useRouter();
  const { gravando, duracaoMs, iniciar, parar } = useVoiceRecording();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Guarda a gravação que falhou no envio, para tentar de novo sem regravar.
  const pendente = useRef<Pendente | null>(null);
  const [temPendente, setTemPendente] = useState(false);

  async function enviar(gravacao: Pendente) {
    setErro(null);
    setEnviando(true);

    try {
      const job = await enviarGravacao(gravacao);

      pendente.current = null;
      setTemPendente(false);
      router.replace({ pathname: '/activity/confirm-draft', params: { id: job.id } });
    } catch (falha) {
      pendente.current = gravacao;
      setTemPendente(true);
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  async function alternarGravacao() {
    setErro(null);

    try {
      if (!gravando) {
        pendente.current = null;
        setTemPendente(false);

        const permitido = await iniciar();

        if (!permitido) {
          setErro(
            'O AgroBot precisa do microfone para gravar. Libere a permissão nas configurações do celular.'
          );
        }

        return;
      }

      const duracao = duracaoMs;
      const uri = await parar();

      if (!uri || duracao < DURACAO_MINIMA_MS) {
        setErro('A gravação ficou muito curta. Toque e fale de novo.');
        return;
      }

      await enviar({ uri, clientId: novoClientId() });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  async function enviarArquivo() {
    setErro(null);

    try {
      const uri = await escolherArquivoDeAudio();

      if (!uri) return;

      pendente.current = null;
      setTemPendente(false);

      await enviar({ uri, clientId: novoClientId() });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  return (
    <Tela rolagem={false}>
      <View style={styles.centro}>
        {enviando ? (
          <>
            <ActivityIndicator size="large" color={cores.primaria} />
            <Text style={styles.enviando}>Enviando sua gravação…</Text>
          </>
        ) : (
          <>
            <Text style={styles.dica}>
              Diga o que fez, com qual produto, quanto e em qual talhão.
            </Text>
            <GravadorVoz
              gravando={gravando}
              duracaoMs={duracaoMs}
              onPress={alternarGravacao}
            />
          </>
        )}
      </View>

      <Erro>{erro}</Erro>

      {temPendente && !enviando && !gravando ? (
        <BotaoGrande
          texto="Tentar enviar de novo"
          onPress={() => pendente.current && enviar(pendente.current)}
        />
      ) : null}

      {!enviando && !gravando ? (
        <View style={styles.arquivo}>
          <BotaoGrande
            texto="Enviar áudio já gravado"
            variante="secundario"
            onPress={enviarArquivo}
          />
        </View>
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dica: {
    fontSize: 19,
    lineHeight: 27,
    color: cores.textoSuave,
    textAlign: 'center',
    marginBottom: 40
  },
  enviando: {
    fontSize: 20,
    color: cores.texto,
    marginTop: 20
  },
  arquivo: {
    marginTop: 12
  }
});
