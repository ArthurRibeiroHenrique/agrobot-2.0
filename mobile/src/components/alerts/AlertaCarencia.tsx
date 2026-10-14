import { StyleSheet, Text } from 'react-native';

import { cores } from '../../lib/constants';

export function AlertaCarencia({ mensagem }: { mensagem: string }) {
  return <Text style={styles.alerta}>{mensagem}</Text>;
}

const styles = StyleSheet.create({
  alerta: {
    fontSize: 17,
    color: cores.alerta,
    backgroundColor: cores.alertaFundo,
    borderRadius: 12,
    padding: 14
  }
});
