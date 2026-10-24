import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RespostaAssistente } from '../../components/assistant/RespostaAssistente';
import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Opcoes } from '../../components/ui/Opcoes';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useFields } from '../../hooks/useFarm';
import { useAskVoiceJob, useConfirmVoiceJob, useVoiceJob } from '../../hooks/useVoiceJob';
import { cores, TIPOS_DE_ATIVIDADE } from '../../lib/constants';
import { formatarData, formatarNumero, lerData, lerNumero } from '../../lib/format';
import { mensagemDeErro } from '../../services/api';
import type { ActivityDraft } from '../../types';

const SEM_TALHAO = 'nenhum';

const MENSAGEM_DE_STATUS: Record<string, string> = {
  queued: 'Sua gravação está na fila…',
  transcribing: 'Ouvindo o que você falou…',
  extracting: 'Entendendo o que você falou…'
};

// Status em que já existe rascunho para preencher o formulário.
const COM_RASCUNHO = ['needs_confirmation', 'answered'];

type Formulario = {
  tipo: string;
  produto: string;
  quantidade: string;
  unidade: string;
  talhaoId: string | null;
  talhaoNome: string;
  data: string;
  custo: string;
};

function paraFormulario(draft: Partial<ActivityDraft>): Formulario {
  return {
    tipo: draft.activity_type ?? 'outro',
    produto: draft.product ?? '',
    quantidade: formatarNumero(draft.quantity),
    unidade: draft.unit ?? '',
    talhaoId: draft.field_id ?? null,
    talhaoNome: draft.field_name ?? '',
    data: draft.occurred_at ? formatarData(draft.occurred_at) : '',
    custo: formatarNumero(draft.cost)
  };
}

export default function ConfirmDraftScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useVoiceJob(id);
  const talhoes = useFields();
  const confirmar = useConfirmVoiceJob(id);
  const perguntar = useAskVoiceJob(id);

  const [form, setForm] = useState<Formulario | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O produtor escolheu anotar no diário (fala incerta ou pergunta que era registro).
  const [querAnotar, setQuerAnotar] = useState(false);

  const status = job.data?.status;
  const intent = job.data?.intent;
  const draft = job.data?.draft;
  const resposta = job.data?.answer;

  // Preenche o formulário uma única vez, quando o rascunho chega.
  useEffect(() => {
    if (status && COM_RASCUNHO.includes(status) && draft && form === null) {
      setForm(paraFormulario(draft));
    }
  }, [status, draft, form]);

  function alterar(campos: Partial<Formulario>) {
    setForm((atual) => (atual ? { ...atual, ...campos } : atual));
  }

  async function salvar() {
    if (!form) return;

    const data = lerData(form.data);

    if (!data) {
      setErro('Confira a data. Use o formato dia/mês/ano, como 06/10/2026.');
      return;
    }

    setErro(null);

    try {
      await confirmar.mutateAsync({
        activity_type: form.tipo,
        product: form.produto.trim() || null,
        quantity: lerNumero(form.quantidade),
        unit: form.unidade.trim() || null,
        field_id: form.talhaoId,
        field_name: form.talhaoNome.trim() || null,
        occurred_at: data,
        cost: lerNumero(form.custo)
      });

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
          onPress={() => router.replace('/activity/new-voice')}
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

  if (!form) {
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
          onPress={() => router.replace('/activity/new-voice')}
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

  const faltando = new Set(draft?.missing_fields ?? []);
  const semFala = !job.data?.transcript;

  const opcoesDeTalhao = [
    ...(talhoes.data ?? []).map((talhao) => ({ valor: talhao.id, rotulo: talhao.name })),
    { valor: SEM_TALHAO, rotulo: 'Nenhum' }
  ];

  return (
    <Tela>
      <Titulo>Está certo?</Titulo>

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

      {faltando.size > 0 ? (
        <Paragrafo>Os campos marcados com “confira” não ficaram claros na fala.</Paragrafo>
      ) : null}

      <Opcoes
        rotulo="O que foi feito"
        opcoes={TIPOS_DE_ATIVIDADE}
        valor={form.tipo}
        onChange={(tipo) => alterar({ tipo })}
        faltando={faltando.has('activity_type')}
      />

      <Campo
        rotulo="Produto"
        value={form.produto}
        onChangeText={(produto) => alterar({ produto })}
        faltando={faltando.has('product')}
      />

      <View style={styles.linha}>
        <View style={styles.coluna}>
          <Campo
            rotulo="Quantidade"
            value={form.quantidade}
            onChangeText={(quantidade) => alterar({ quantidade })}
            keyboardType="decimal-pad"
            faltando={faltando.has('quantity')}
          />
        </View>
        <View style={styles.coluna}>
          <Campo
            rotulo="Unidade"
            value={form.unidade}
            onChangeText={(unidade) => alterar({ unidade })}
            autoCapitalize="none"
            placeholder="kg, L, sc…"
            faltando={faltando.has('unit')}
          />
        </View>
      </View>

      {(talhoes.data ?? []).length > 0 ? (
        <Opcoes
          rotulo="Talhão"
          opcoes={opcoesDeTalhao}
          valor={form.talhaoId ?? SEM_TALHAO}
          onChange={(valor) => {
            const talhao = talhoes.data?.find((item) => item.id === valor);

            alterar({
              talhaoId: talhao?.id ?? null,
              talhaoNome: talhao?.name ?? ''
            });
          }}
          faltando={faltando.has('field_name') || faltando.has('field_id')}
        />
      ) : (
        <Campo
          rotulo="Talhão"
          value={form.talhaoNome}
          onChangeText={(talhaoNome) => alterar({ talhaoNome })}
          faltando={faltando.has('field_name')}
        />
      )}

      <Campo
        rotulo="Data"
        value={form.data}
        onChangeText={(data) => alterar({ data })}
        keyboardType="numbers-and-punctuation"
        placeholder="dd/mm/aaaa"
      />

      <Campo
        rotulo="Custo em reais (se houver)"
        value={form.custo}
        onChangeText={(custo) => alterar({ custo })}
        keyboardType="decimal-pad"
        faltando={faltando.has('cost')}
      />

      <Erro>{erro}</Erro>

      <BotaoGrande texto="Salvar no diário" onPress={salvar} carregando={confirmar.isPending} />
      <View style={styles.espaco} />
      <BotaoGrande
        texto="Gravar de novo"
        variante="secundario"
        onPress={() => router.replace('/activity/new-voice')}
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
  linha: {
    flexDirection: 'row',
    gap: 12
  },
  coluna: {
    flex: 1
  },
  espaco: {
    height: 12
  }
});
