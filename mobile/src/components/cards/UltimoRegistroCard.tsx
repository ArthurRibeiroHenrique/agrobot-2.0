import { StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';
import type { Activity } from '../../types';
import { AtividadeCard } from './AtividadeCard';

export function UltimoRegistroCard({ atividade }: { atividade: Activity | null }) {
  return (
    <View>
      <Text style={styles.titulo}>Último registro</Text>
      {atividade ? (
        <AtividadeCard atividade={atividade} />
      ) : (
        <Text style={styles.vazio}>Você ainda não registrou nenhuma atividade.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 8
  },
  vazio: {
    fontSize: 17,
    color: cores.textoSuave
  }
});
