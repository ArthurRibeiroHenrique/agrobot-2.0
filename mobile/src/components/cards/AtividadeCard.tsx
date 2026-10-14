import { StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';
import {
  formatarData,
  formatarDinheiro,
  formatarNumero,
  rotuloDoTipo
} from '../../lib/format';
import type { Activity } from '../../types';

export function AtividadeCard({ atividade }: { atividade: Activity }) {
  const quantidade =
    atividade.quantity !== null
      ? `${formatarNumero(atividade.quantity)} ${atividade.unit ?? ''}`.trim()
      : null;

  const detalhes = [atividade.product, quantidade, atividade.field_name]
    .filter(Boolean)
    .join('  •  ');

  return (
    <View style={styles.cartao}>
      <View style={styles.cabecalho}>
        <Text style={styles.tipo}>{rotuloDoTipo(atividade.activity_type)}</Text>
        <Text style={styles.data}>{formatarData(atividade.occurred_at)}</Text>
      </View>
      {detalhes ? <Text style={styles.detalhes}>{detalhes}</Text> : null}
      {atividade.cost !== null ? (
        <Text style={styles.custo}>{formatarDinheiro(atividade.cost)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    marginBottom: 12
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  tipo: {
    fontSize: 19,
    fontWeight: '700',
    color: cores.primariaEscura
  },
  data: {
    fontSize: 16,
    color: cores.textoSuave
  },
  detalhes: {
    fontSize: 17,
    color: cores.texto
  },
  custo: {
    fontSize: 16,
    color: cores.textoSuave,
    marginTop: 4
  }
});
