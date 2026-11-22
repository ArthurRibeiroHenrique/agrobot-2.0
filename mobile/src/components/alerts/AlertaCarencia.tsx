import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';
import { formatarData } from '../../lib/format';
import type { AlertaDeCarencia } from '../../types';

type Props = {
  alerta: AlertaDeCarencia;
  // Abre o registro para corrigir ou informar a carência.
  onPress: () => void;
};

function plural(n: number, um: string, varios: string) {
  return n === 1 ? `1 ${um}` : `${n} ${varios}`;
}

// Um cartão por aplicação. Vermelho: ainda não pode colher. Amarelo: falta a carência da bula.
// Verde: já pode colher. A frase principal diz o que fazer, sem depender só da cor.
export function AlertaCarencia({ alerta, onPress }: Props) {
  const talhao = alerta.field_name || 'Talhão não informado';
  const produto = alerta.product || 'Produto não informado';
  const aplicado = `${produto}, aplicado em ${formatarData(alerta.applied_at)}`;

  let estilo = styles.liberado;
  let principal: string;
  let detalhe: string;
  let acao: string;

  if (alerta.estado === 'em_carencia') {
    estilo = styles.emCarencia;
    principal = `Não colha antes de ${formatarData(alerta.liberaEm)}`;
    detalhe = `Faltam ${plural(alerta.diasRestantes, 'dia', 'dias')}. ${aplicado}, carência de ${plural(alerta.withholding_days ?? 0, 'dia', 'dias')}.`;
    acao = 'Toque para ver ou corrigir o registro';
  } else if (alerta.estado === 'sem_carencia') {
    estilo = styles.semCarencia;
    principal = 'Falta a carência da bula';
    detalhe = `${aplicado}. Sem esse número, o AgroBot não sabe quando você pode colher.`;
    acao = 'Toque para anotar a carência';
  } else {
    principal =
      alerta.diasDesdeLiberacao === 0
        ? 'Pode colher a partir de hoje'
        : `Pode colher desde ${formatarData(alerta.liberaEm)}`;
    detalhe = `${aplicado}, carência de ${plural(alerta.withholding_days ?? 0, 'dia', 'dias')}.`;
    acao = 'Toque para ver o registro';
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${talhao}. ${principal}. ${detalhe} ${acao}.`}
      onPress={onPress}
      style={({ pressed }) => [styles.cartao, estilo, pressed && styles.pressionado]}
    >
      <Text style={styles.talhao}>{talhao}</Text>
      <Text style={styles.principal}>{principal}</Text>
      <Text style={styles.detalhe}>{detalhe}</Text>
      <View style={styles.rodape}>
        <Text style={styles.acao}>{acao} ›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: 14,
    borderLeftWidth: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12
  },
  emCarencia: {
    backgroundColor: cores.erroFundo,
    borderColor: cores.erro
  },
  semCarencia: {
    backgroundColor: cores.alertaFundo,
    borderColor: cores.alerta
  },
  liberado: {
    backgroundColor: cores.destaque,
    borderColor: cores.primaria
  },
  pressionado: {
    opacity: 0.8
  },
  talhao: {
    fontSize: 17,
    fontWeight: '700',
    color: cores.textoSuave,
    marginBottom: 2
  },
  principal: {
    fontSize: 22,
    fontWeight: '800',
    color: cores.texto,
    marginBottom: 6
  },
  detalhe: {
    fontSize: 17,
    lineHeight: 24,
    color: cores.texto
  },
  rodape: {
    marginTop: 8
  },
  acao: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.primariaEscura
  }
});
