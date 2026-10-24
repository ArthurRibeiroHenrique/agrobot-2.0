import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RespostaAssistente } from '../../components/assistant/RespostaAssistente';
import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useAskAssistant, useAssistantMessages } from '../../hooks/useAssistant';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';

export default function AssistantScreen() {
  const router = useRouter();
  const historico = useAssistantMessages();
  const perguntar = useAskAssistant();
  const [pergunta, setPergunta] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    const texto = pergunta.trim();

    if (!texto) {
      setErro('Escreva a sua pergunta.');
      return;
    }

    setErro(null);

    try {
      await perguntar.mutateAsync(texto);
      setPergunta('');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  const mensagens = historico.data ?? [];

  return (
    <Tela>
      <Titulo>Tire sua dúvida</Titulo>
      <Paragrafo>
        Pergunte sobre a sua lavoura. Por exemplo: “Quando foi a última adubação no talhão dois?”
      </Paragrafo>

      <Campo
        rotulo="Sua pergunta"
        value={pergunta}
        onChangeText={setPergunta}
        multiline
        style={styles.campo}
        editable={!perguntar.isPending}
      />

      <Erro>{erro}</Erro>

      <BotaoGrande texto="Perguntar" onPress={enviar} carregando={perguntar.isPending} />
      <View style={styles.espacoPequeno} />
      <BotaoGrande
        texto="Perguntar por voz"
        variante="secundario"
        onPress={() => router.push('/activity/new-voice')}
      />

      <View style={styles.espaco} />

      {historico.isLoading ? (
        <ActivityIndicator size="large" color={cores.primaria} />
      ) : historico.isError ? (
        <Erro>{mensagemDeErro(historico.error)}</Erro>
      ) : mensagens.length === 0 ? (
        <Text style={styles.vazio}>Suas perguntas e respostas vão aparecer aqui.</Text>
      ) : (
        mensagens.map((mensagem) => (
          <RespostaAssistente
            key={mensagem.id}
            pergunta={mensagem.question}
            resposta={mensagem.answer}
            precisaTecnico={mensagem.needs_technician}
          />
        ))
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  campo: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top'
  },
  espaco: {
    height: 28
  },
  espacoPequeno: {
    height: 12
  },
  vazio: {
    fontSize: 17,
    color: cores.textoSuave,
    textAlign: 'center'
  }
});
