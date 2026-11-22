import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { GravadorVoz } from '../../components/voice/GravadorVoz';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';
import { escolherArquivoDeAudio } from '../../services/audio';
import { descartarDaFila, enviarDaFila, guardarGravacao } from '../../services/filaOffline';

// Gravações mais curtas que isso quase sempre são toque acidental.
const DURACAO_MINIMA_MS = 1000;

// A transcrição é cobrada por minuto de áudio: uma gravação esquecida ligada vira custo.
// Dois minutos sobram para relatar várias atividades ou fazer uma pergunta.
const DURACAO_MAXIMA_MS = 2 * 60 * 1000;

export default function NewVoiceScreen() {
  const router = useRouter();
  const { gravando, duracaoMs, iniciar, parar } = useVoiceRecording();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Sem sinal: a gravação ficou guardada na fila e vai sozinha quando a internet voltar.
  const [guardada, setGuardada] = useState(false);
  const parandoPorLimite = useRef(false);

  // No limite de duração, para e envia sozinho, como se o produtor tivesse tocado em parar.
  useEffect(() => {
    if (!gravando) {
      parandoPorLimite.current = false;
      return;
    }

    if (duracaoMs >= DURACAO_MAXIMA_MS && !parandoPorLimite.current) {
      parandoPorLimite.current = true;
      void alternarGravacao();
    }
    // alternarGravacao muda a cada render; só a duração e o estado da gravação importam aqui.
  }, [gravando, duracaoMs]);

  // Guarda no celular primeiro e só depois tenta enviar: sem sinal, nada se perde.
  async function processar(uri: string) {
    setErro(null);
    setEnviando(true);

    try {
      const item = await guardarGravacao(uri);
      const resultado = await enviarDaFila(item);

      if (resultado.tipo === 'enviada') {
        router.replace({ pathname: '/activity/confirm-draft', params: { id: resultado.job.id } });
        return;
      }

      if (resultado.tipo === 'sem-conexao') {
        setGuardada(true);
      } else {
        // O servidor não aceita esse áudio: guardar para tentar de novo não adianta.
        descartarDaFila(item.clientId);
        setErro(resultado.erro);
      }
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }

    setEnviando(false);
  }

  async function alternarGravacao() {
    setErro(null);

    try {
      if (!gravando) {
        setGuardada(false);

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

      await processar(uri);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  async function enviarArquivo() {
    setErro(null);

    try {
      const uri = await escolherArquivoDeAudio();

      if (!uri) return;

      setGuardada(false);
      await processar(uri);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  if (guardada && !gravando) {
    return (
      <Tela>
        <Titulo>Gravação guardada</Titulo>
        <Paragrafo>
          Não deu para enviar agora, provavelmente por falta de sinal. Sua gravação ficou
          guardada no celular e será enviada sozinha quando a internet voltar. Depois é só
          conferir na tela inicial.
        </Paragrafo>
        <BotaoGrande texto="Gravar outra" onPress={() => setGuardada(false)} />
        <View style={styles.arquivo}>
          <BotaoGrande texto="Voltar ao início" variante="secundario" onPress={() => router.back()} />
        </View>
      </Tela>
    );
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
              Conte o que fez (produto, quantidade e talhão) ou faça uma pergunta.
            </Text>
            <GravadorVoz
              gravando={gravando}
              duracaoMs={duracaoMs}
              duracaoMaximaMs={DURACAO_MAXIMA_MS}
              onPress={alternarGravacao}
            />
          </>
        )}
      </View>

      <Erro>{erro}</Erro>

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
