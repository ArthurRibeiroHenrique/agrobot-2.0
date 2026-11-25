import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icone: NomeDoIcone;
  rotulo: string;
  valor: string;
  // De 0 a 1: a maior barra da lista vale 1.
  proporcao: number;
  seta?: boolean;
};

// Linha do resumo: ícone, nome, quantidade e uma barra simples. Quanto maior a barra, mais vezes.
export function LinhaComBarra({ icone, rotulo, valor, proporcao, seta = false }: Props) {
  return (
    <View style={styles.linha}>
      <View style={styles.topo}>
        <Ionicons name={icone} size={22} color={cores.primariaEscura} />
        <Text style={styles.rotulo} numberOfLines={2}>
          {rotulo}
        </Text>
        <Text style={styles.valor}>{valor}</Text>
        {seta ? <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} /> : null}
      </View>
      <View style={styles.trilho}>
        <View style={[styles.barra, { width: `${Math.max(4, Math.round(proporcao * 100))}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    paddingVertical: 8
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  rotulo: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto
  },
  valor: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.primariaEscura
  },
  trilho: {
    height: 14,
    borderRadius: 7,
    backgroundColor: cores.fundo,
    borderWidth: 1,
    borderColor: cores.borda,
    overflow: 'hidden'
  },
  barra: {
    height: '100%',
    backgroundColor: cores.primaria,
    borderRadius: 7
  }
});
