import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import {
  CamposDoRegistro,
  Formulario,
  paraFormulario
} from '../../components/activity/CamposDoRegistro';
import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Erro, Tela, Titulo } from '../../components/ui/Tela';
import {
  useActivity,
  useDeleteActivity,
  useUpdateActivity
} from '../../hooks/useActivities';
import { useFields } from '../../hooks/useFarm';
import { cores } from '../../lib/constants';
import { lerData, lerDiasDeCarencia, lerNumero } from '../../lib/format';
import { mensagemDeErro } from '../../services/api';

// Detalhes de um registro do diário: o produtor corrige os campos ou apaga o registro.
export default function EditActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const atividade = useActivity(id);
  const talhoes = useFields();
  const salvarAlteracao = useUpdateActivity(id);
  const apagar = useDeleteActivity(id);

  const [form, setForm] = useState<Formulario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Preenche o formulário uma única vez, quando o registro chega.
  useEffect(() => {
    if (atividade.data && form === null) {
      const { raw_transcript: _fala, ...campos } = atividade.data;
      setForm(paraFormulario(campos, 0));
    }
  }, [atividade.data, form]);

  async function salvar() {
    if (!form) return;

    const data = lerData(form.data);

    if (!data) {
      setErro('Confira a data. Use o formato dia/mês/ano, como 06/10/2026.');
      return;
    }

    const carencia = form.tipo === 'aplicacao' ? lerDiasDeCarencia(form.carencia) : null;

    if (carencia === undefined) {
      setErro('Confira a carência: um número de 0 a 365 dias, como está na bula.');
      return;
    }

    setErro(null);

    try {
      await salvarAlteracao.mutateAsync({
        activity_type: form.tipo,
        product: form.produto.trim() || null,
        quantity: lerNumero(form.quantidade),
        unit: form.unidade.trim() || null,
        field_id: form.talhaoId,
        field_name: form.talhaoNome.trim() || null,
        occurred_at: data,
        cost: lerNumero(form.custo),
        withholding_days: carencia
      });

      router.back();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  function confirmarApagar() {
    Alert.alert('Apagar registro?', 'O registro sai do diário e não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagar.mutateAsync();
            router.back();
          } catch (falha) {
            setErro(mensagemDeErro(falha));
          }
        }
      }
    ]);
  }

  if (atividade.isError && !atividade.data) {
    return (
      <Tela>
        <Titulo>Não foi possível abrir o registro</Titulo>
        <Erro>{mensagemDeErro(atividade.error)}</Erro>
        <BotaoGrande texto="Tentar de novo" onPress={() => atividade.refetch()} />
      </Tela>
    );
  }

  if (!form) {
    return (
      <Tela rolagem={false}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      </Tela>
    );
  }

  const fala = atividade.data?.raw_transcript;

  return (
    <Tela>
      {fala ? (
        <View style={styles.transcricao}>
          <Text style={styles.transcricaoRotulo}>O que foi falado</Text>
          <Text style={styles.transcricaoTexto}>“{fala}”</Text>
        </View>
      ) : null}

      <CamposDoRegistro
        form={form}
        talhoes={talhoes.data ?? []}
        onChange={(campos) => setForm((atual) => (atual ? { ...atual, ...campos } : atual))}
      />

      <Erro>{erro}</Erro>

      <BotaoGrande
        texto="Salvar alterações"
        onPress={salvar}
        carregando={salvarAlteracao.isPending}
        desabilitado={apagar.isPending}
      />
      <View style={styles.espaco} />
      <BotaoGrande
        texto="Apagar registro"
        variante="secundario"
        onPress={confirmarApagar}
        carregando={apagar.isPending}
        desabilitado={salvarAlteracao.isPending}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
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
    fontSize: 16,
    fontWeight: '600',
    color: cores.textoSuave,
    marginBottom: 4
  },
  transcricaoTexto: {
    fontSize: 18,
    lineHeight: 25,
    color: cores.texto
  },
  espaco: {
    height: 12
  }
});
