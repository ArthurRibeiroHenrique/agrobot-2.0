import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  CamposDoRegistro,
  Formulario,
  paraFormulario
} from '../../components/activity/CamposDoRegistro';
import { RespostaAssistente } from '../../components/assistant/RespostaAssistente';
import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useFields } from '../../hooks/useFarm';
import { useAskVoiceJob, useConfirmVoiceJob, useVoiceJob } from '../../hooks/useVoiceJob';
import { cores } from '../../lib/constants';
import { lerData, lerNumero } from '../../lib/format';
import { mensagemDeErro } from '../../services/api';
import { useOfflineStore } from '../../store/offlineStore';
import type { ActivityDraft, VoiceJob } from '../../types';

const MENSAGEM_DE_STATUS: Record<string, string> = {
  queued: 'Sua gravação está na fila…',
  transcribing: 'Ouvindo o que você falou…',
  extracting: 'Entendendo o que você falou…'
};

// Status em que já existe rascunho para preencher o formulário.
const COM_RASCUNHO = ['needs_confirmation', 'answered'];

// Status em que não falta nada do produtor: a gravação sai da lista "para conferir".
const RESOLVIDO = ['answered', 'confirmed', 'failed'];

// Gravações antigas têm só um rascunho em draft.
function rascunhosDoJob(job: VoiceJob | undefined): Partial<ActivityDraft>[] {
  if (job?.drafts && job.drafts.length > 0) return job.drafts;

  return job?.draft ? [job.draft] : [];
}

export default function ConfirmDraftScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useVoiceJob(id);
  const talhoes = useFields();
  const confirmar = useConfirmVoiceJob(id);
  const perguntar = useAskVoiceJob(id);

  // Um formulário por registro: a fala pode citar vários talhões.
  const [forms, setForms] = useState<Formulario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O produtor escolheu anotar no diário (fala incerta ou pergunta que era registro).
  const [querAnotar, setQuerAnotar] = useState(false);

  const status = job.data?.status;
  const intent = job.data?.intent;
  const resposta = job.data?.answer;

  useEffect(() => {
    if (id && status && RESOLVIDO.includes(status)) {
      useOfflineStore.getState().removerPorJob(id);
    }
  }, [id, status]);

  // Desistiu desta gravação para gravar outra: ela não fica esperando conferência.
  function gravarDeNovo() {
    if (id) useOfflineStore.getState().removerPorJob(id);
    router.replace('/activity/new-voice');
  }

  // Preenche os formulários uma única vez, quando os rascunhos chegam.
  useEffect(() => {
    const rascunhos = rascunhosDoJob(job.data);

    if (status && COM_RASCUNHO.includes(status) && rascunhos.length > 0 && forms === null) {
      setForms(rascunhos.map(paraFormulario));
    }
  }, [status, job.data, forms]);

  function alterar(chave: number, campos: Partial<Formulario>) {
    setForms((atuais) =>
      atuais?.map((form) => (form.chave === chave ? { ...form, ...campos } : form)) ?? atuais
    );
  }

  // A IA separou um registro que não devia: o produtor descarta antes de salvar.
  function remover(chave: number) {
    setForms((atuais) => atuais?.filter((form) => form.chave !== chave) ?? atuais);
  }

  async function salvar() {
    if (!forms || forms.length === 0) return;

    const datas = forms.map((form) => lerData(form.data));
    const semData = datas.findIndex((data) => !data);

    if (semData >= 0) {
      setErro(
        forms.length > 1
          ? `Confira a data do registro ${semData + 1}. Use o formato dia/mês/ano, como 06/10/2026.`
          : 'Confira a data. Use o formato dia/mês/ano, como 06/10/2026.'
      );
      return;
    }

    setErro(null);

    try {
      await confirmar.mutateAsync(
        forms.map((form, indice) => ({
          // Mantém o que o formulário não mostra (moeda, confiança) do rascunho original.
          ...form.rascunho,
          activity_type: form.tipo,
          product: form.produto.trim() || null,
          quantity: lerNumero(form.quantidade),
          unit: form.unidade.trim() || null,
          field_id: form.talhaoId,
          field_name: form.talhaoNome.trim() || null,
          occurred_at: datas[indice],
          cost: lerNumero(form.custo)
        }))
      );

      if (id) useOfflineStore.getState().removerPorJob(id);
      router.dismissTo('/diary');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  async function tratarComoPergunta() {
    setErro(null);

    try {
      await perguntar.mutateAsync();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  if (job.isError && !job.data) {
    return (
      <Tela>
        <Titulo>Não foi possível carregar</Titulo>
        <Erro>{mensagemDeErro(job.error)}</Erro>
        <BotaoGrande texto="Tentar de novo" onPress={() => job.refetch()} />
      </Tela>
    );
  }

  if (status === 'failed') {
    return (
      <Tela>
        <Titulo>Não consegui entender a gravação</Titulo>
        <Paragrafo>
          Aconteceu um problema ao processar o áudio. Grave de novo, falando perto do celular.
        </Paragrafo>
        <BotaoGrande
          texto="Gravar de novo"
          onPress={gravarDeNovo}
        />
      </Tela>
    );
  }

  if (status === 'confirmed') {
    return (
      <Tela>
        <Titulo>Registro já salvo</Titulo>
        <BotaoGrande texto="Ver o diário" onPress={() => router.dismissTo('/diary')} />
      </Tela>
    );
  }

  if (!forms) {
    return (
      <Tela rolagem={false}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={styles.status}>
            {MENSAGEM_DE_STATUS[status ?? 'queued'] ?? 'Aguarde…'}
          </Text>
        </View>
      </Tela>
    );
  }

  const transcricao = job.data?.transcript ? (
    <View style={styles.transcricao}>
      <Text style={styles.transcricaoRotulo}>Você disse</Text>
      <Text style={styles.transcricaoTexto}>“{job.data.transcript}”</Text>
    </View>
  ) : null;

  if (status === 'answered' && resposta && !querAnotar) {
    return (
      <Tela>
        <Stack.Screen options={{ title: 'Resposta' }} />
        {transcricao}
        <RespostaAssistente
          resposta={resposta.answer}
          precisaTecnico={resposta.needs_technician}
        />
        <BotaoGrande
          texto="Fazer outra pergunta"
          onPress={gravarDeNovo}
        />
        <View style={styles.espaco} />
        <BotaoGrande
          texto="Era um registro? Anotar no diário"
          variante="secundario"
          onPress={() => setQuerAnotar(true)}
        />
      </Tela>
    );
  }

  if (intent === 'incerto' && status === 'needs_confirmation' && !querAnotar) {
    return (
      <Tela>
        <Stack.Screen options={{ title: 'O que você quer fazer?' }} />
        <Titulo>O que você quer fazer?</Titulo>
        {transcricao}
        <Paragrafo>Não entendi se você quer anotar isso no diário ou tirar uma dúvida.</Paragrafo>
        <BotaoGrande texto="Anotar no diário" onPress={() => setQuerAnotar(true)} />
        <View style={styles.espaco} />
        <BotaoGrande
          texto="Tirar uma dúvida"
          variante="secundario"
          onPress={tratarComoPergunta}
          carregando={perguntar.isPending}
        />
        <Erro>{erro}</Erro>
      </Tela>
    );
  }

  const semFala = !job.data?.transcript;
  const varios = forms.length > 1;
  const algumFaltando = forms.some((form) => (form.rascunho.missing_fields ?? []).length > 0);

  return (
    <Tela>
      <Titulo>{varios ? `Entendi ${forms.length} registros. Estão certos?` : 'Está certo?'}</Titulo>

      {semFala ? (
        <Paragrafo>Não ouvi nenhuma fala na gravação. Preencha abaixo ou grave de novo.</Paragrafo>
      ) : (
        transcricao
      )}

      {/* Fala com registro e pergunta: a resposta vem antes do formulário. */}
      {resposta ? (
        <RespostaAssistente
          pergunta={resposta.question}
          resposta={resposta.answer}
          precisaTecnico={resposta.needs_technician}
        />
      ) : null}

      {algumFaltando ? (
        <Paragrafo>Os campos marcados com “confira” não ficaram claros na fala.</Paragrafo>
      ) : null}

      {varios ? (
        forms.map((form, indice) => (
          <View key={form.chave} style={styles.registro}>
            <Text style={styles.registroTitulo}>
              Registro {indice + 1} de {forms.length}
              {form.talhaoNome ? ` · ${form.talhaoNome}` : ''}
            </Text>
            <CamposDoRegistro
              form={form}
              talhoes={talhoes.data ?? []}
              onChange={(campos) => alterar(form.chave, campos)}
            />
            <BotaoGrande
              texto="Remover este registro"
              variante="secundario"
              onPress={() => remover(form.chave)}
            />
          </View>
        ))
      ) : (
        <CamposDoRegistro
          form={forms[0]}
          talhoes={talhoes.data ?? []}
          onChange={(campos) => alterar(forms[0].chave, campos)}
        />
      )}

      <Erro>{erro}</Erro>

      <BotaoGrande
        texto={varios ? `Salvar os ${forms.length} no diário` : 'Salvar no diário'}
        onPress={salvar}
        carregando={confirmar.isPending}
      />
      <View style={styles.espaco} />
      <BotaoGrande
        texto="Gravar de novo"
        variante="secundario"
        onPress={gravarDeNovo}
      />

      {!resposta && !semFala && status === 'needs_confirmation' ? (
        <>
          <View style={styles.espaco} />
          <BotaoGrande
            texto="Era uma pergunta? Perguntar ao AgroBot"
            variante="secundario"
            onPress={tratarComoPergunta}
            carregando={perguntar.isPending}
          />
        </>
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
  status: {
    fontSize: 20,
    color: cores.texto,
    marginTop: 20,
    textAlign: 'center'
  },
  transcricao: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    marginBottom: 16
  },
  transcricaoRotulo: {
    fontSize: 14,
    color: cores.textoSuave,
    marginBottom: 4
  },
  transcricaoTexto: {
    fontSize: 18,
    lineHeight: 25,
    color: cores.texto
  },
  registro: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    marginBottom: 16
  },
  registroTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.primariaEscura,
    marginBottom: 8
  },
  espaco: {
    height: 12
  }
});
