import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';
import {
  formatarData,
  formatarDinheiro,
  formatarNumero,
  rotuloDoTipo,
  textoUtil
} from '../../lib/format';
import type { Activity } from '../../types';

const CRIACOES = /\b(gado|boi|bois|vaca|vacas|bezerr|novilh|bovin|pecuari|leite|porco|suin|galinha|frango|ave|ovelha|cabra)/i;

// "milho" vira "Milho" para o destaque do cartão.
function nomeDaCultura(cultura: string): string {
  return cultura.charAt(0).toUpperCase() + cultura.slice(1);
}

export function AtividadeCard({ atividade }: { atividade: Activity }) {
  const router = useRouter();
  const cultura = textoUtil(atividade.crop);
  const unidade = textoUtil(atividade.unit);
  // Quantidade zero ou vazia não aparece (a IA às vezes grava 0 para o que não foi dito).
  const quantidade =
    atividade.quantity !== null && atividade.quantity > 0
      ? `${formatarNumero(atividade.quantity)} ${unidade ?? ''}`.trim()
      : null;

  const detalhes = [textoUtil(atividade.product), quantidade, textoUtil(atividade.field_name)]
    .filter(Boolean)
    .join('  •  ');

  const custo = atividade.cost !== null && atividade.cost > 0 ? atividade.cost : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        rotuloDoTipo(atividade.activity_type),
        cultura ? `de ${cultura}` : null,
        formatarData(atividade.occurred_at),
        detalhes || null,
        custo !== null ? formatarDinheiro(custo) : null
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Abre os detalhes do registro"
      onPress={() =>
        router.push({ pathname: '/activity/edit', params: { id: atividade.id } })
      }
      style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
    >
      <View style={styles.cabecalho}>
        <View style={styles.titulo}>
          <Text style={styles.tipo}>{rotuloDoTipo(atividade.activity_type)}</Text>
          {cultura ? (
            <View style={styles.cultura}>
              <Ionicons
                name={CRIACOES.test(cultura) ? 'paw' : 'leaf'}
                size={16}
                color={cores.branco}
              />
              <Text style={styles.culturaTexto} numberOfLines={1}>
                {nomeDaCultura(cultura)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.data}>{formatarData(atividade.occurred_at)}</Text>
      </View>
      {detalhes ? <Text style={styles.detalhes}>{detalhes}</Text> : null}
      {custo !== null ? <Text style={styles.custo}>{formatarDinheiro(custo)}</Text> : null}
    </Pressable>
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
  pressionado: {
    opacity: 0.7
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6
  },
  titulo: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8
  },
  tipo: {
    fontSize: 19,
    fontWeight: '700',
    color: cores.primariaEscura
  },
  cultura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: cores.primaria,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: 180
  },
  culturaTexto: {
    fontSize: 16,
    fontWeight: '800',
    color: cores.branco
  },
  data: {
    fontSize: 16,
    color: cores.textoSuave,
    marginTop: 2
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
