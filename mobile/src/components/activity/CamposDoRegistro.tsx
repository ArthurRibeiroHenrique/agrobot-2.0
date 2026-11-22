import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSugestaoDeCarencia } from '../../hooks/useCarencia';
import { cores, TIPOS_DE_ATIVIDADE } from '../../lib/constants';
import { formatarData, formatarNumero } from '../../lib/format';
import type { ActivityDraft, Field } from '../../types';
import { Campo } from '../ui/Campo';
import { Opcoes } from '../ui/Opcoes';

const SEM_TALHAO = 'nenhum';

// Formulário de um registro: usado na confirmação do rascunho e na edição do diário.
export type Formulario = {
  // Identifica o formulário na lista mesmo depois de o produtor remover outro.
  chave: number;
  rascunho: Partial<ActivityDraft>;
  tipo: string;
  produto: string;
  quantidade: string;
  unidade: string;
  talhaoId: string | null;
  talhaoNome: string;
  data: string;
  custo: string;
  // Dias de carência da bula, como texto do campo.
  carencia: string;
};

export function paraFormulario(draft: Partial<ActivityDraft>, chave: number): Formulario {
  return {
    chave,
    rascunho: draft,
    tipo: draft.activity_type ?? 'outro',
    produto: draft.product ?? '',
    quantidade: formatarNumero(draft.quantity),
    unidade: draft.unit ?? '',
    talhaoId: draft.field_id ?? null,
    talhaoNome: draft.field_name ?? '',
    data: draft.occurred_at ? formatarData(draft.occurred_at) : '',
    custo: formatarNumero(draft.cost),
    carencia:
      draft.withholding_days === null || draft.withholding_days === undefined
        ? ''
        : String(draft.withholding_days)
  };
}

type CamposProps = {
  form: Formulario;
  talhoes: Field[];
  onChange: (campos: Partial<Formulario>) => void;
};

export function CamposDoRegistro({ form, talhoes, onChange }: CamposProps) {
  const faltando = new Set(form.rascunho.missing_fields ?? []);
  const aplicacao = form.tipo === 'aplicacao';
  const sugestao = useSugestaoDeCarencia(
    form.produto,
    form.talhaoId,
    aplicacao && form.carencia.trim() === ''
  ).data;

  const opcoesDeTalhao = [
    ...talhoes.map((talhao) => ({ valor: talhao.id, rotulo: talhao.name })),
    { valor: SEM_TALHAO, rotulo: 'Nenhum' }
  ];

  return (
    <>
      <Opcoes
        rotulo="O que foi feito"
        opcoes={TIPOS_DE_ATIVIDADE}
        valor={form.tipo}
        onChange={(tipo) => onChange({ tipo })}
        faltando={faltando.has('activity_type')}
      />

      <Campo
        rotulo="Produto"
        value={form.produto}
        onChangeText={(produto) => onChange({ produto })}
        faltando={faltando.has('product')}
      />

      <View style={styles.linha}>
        <View style={styles.coluna}>
          <Campo
            rotulo="Quantidade"
            value={form.quantidade}
            onChangeText={(quantidade) => onChange({ quantidade })}
            keyboardType="decimal-pad"
            faltando={faltando.has('quantity')}
          />
        </View>
        <View style={styles.coluna}>
          <Campo
            rotulo="Unidade"
            value={form.unidade}
            onChangeText={(unidade) => onChange({ unidade })}
            autoCapitalize="none"
            placeholder="kg, L, sc…"
            faltando={faltando.has('unit')}
          />
        </View>
      </View>

      {talhoes.length > 0 ? (
        <Opcoes
          rotulo="Talhão"
          opcoes={opcoesDeTalhao}
          valor={form.talhaoId ?? SEM_TALHAO}
          onChange={(valor) => {
            const talhao = talhoes.find((item) => item.id === valor);

            onChange({
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
          onChangeText={(talhaoNome) => onChange({ talhaoNome })}
          faltando={faltando.has('field_name')}
        />
      )}

      <Campo
        rotulo="Data"
        value={form.data}
        onChangeText={(data) => onChange({ data })}
        keyboardType="numbers-and-punctuation"
        placeholder="dd/mm/aaaa"
      />

      {aplicacao ? (
        <View style={styles.carencia}>
          <Campo
            rotulo="Carência da bula (dias)"
            value={form.carencia}
            onChangeText={(carencia) => onChange({ carencia: carencia.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="Ex.: 30"
          />
          <Text style={styles.dica}>
            Está na bula como “intervalo de segurança”, para a cultura deste talhão. O AgroBot
            avisa o dia em que você pode colher.
          </Text>
          {sugestao && form.carencia.trim() === '' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Usar ${sugestao.dias} dias de carência`}
              onPress={() => onChange({ carencia: String(sugestao.dias) })}
              style={({ pressed }) => [styles.sugestao, pressed && styles.pressionado]}
            >
              <Text style={styles.sugestaoTitulo}>Usar {sugestao.dias} dias</Text>
              <Text style={styles.sugestaoTexto}>
                {sugestao.origem === 'bula_anterior'
                  ? 'Foi o que você informou da última vez para este produto nesta cultura. Confira se a bula é a mesma.'
                  : `Catálogo conferido: ${sugestao.referencia ?? 'bula do produto'}. Confira na sua bula.`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Campo
        rotulo="Custo em reais (se houver)"
        value={form.custo}
        onChangeText={(custo) => onChange({ custo })}
        keyboardType="decimal-pad"
        faltando={faltando.has('cost')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  carencia: {
    marginBottom: 16
  },
  dica: {
    fontSize: 16,
    lineHeight: 22,
    color: cores.textoSuave,
    marginTop: -8
  },
  sugestao: {
    marginTop: 10,
    backgroundColor: cores.destaque,
    borderWidth: 2,
    borderColor: cores.primaria,
    borderRadius: 12,
    padding: 12
  },
  pressionado: {
    opacity: 0.8
  },
  sugestaoTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: cores.primariaEscura,
    marginBottom: 2
  },
  sugestaoTexto: {
    fontSize: 16,
    lineHeight: 22,
    color: cores.texto
  },
  linha: {
    flexDirection: 'row',
    gap: 12
  },
  coluna: {
    flex: 1
  }
});
