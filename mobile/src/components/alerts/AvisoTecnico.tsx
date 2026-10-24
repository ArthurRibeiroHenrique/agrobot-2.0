import { StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';

// Aparece quando o assistente não deve decidir sozinho: dose, doença, carência
// ou resposta incerta.
export function AvisoTecnico() {
  return (
    <View style={styles.aviso} accessibilityRole="alert">
      <Text style={styles.titulo}>Procure um técnico agrícola</Text>
      <Text style={styles.texto}>
        Essa dúvida precisa de alguém que conheça a sua lavoura. Fale com o técnico da sua
        cooperativa ou da assistência técnica do seu município (Emater ou Epagri).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    backgroundColor: cores.alertaFundo,
    borderLeftWidth: 5,
    borderLeftColor: cores.alerta,
    borderRadius: 12,
    padding: 14,
    marginTop: 10
  },
  titulo: {
    fontSize: 18,
    fontWeight: '800',
    color: cores.alerta,
    marginBottom: 4
  },
  texto: {
    fontSize: 16,
    lineHeight: 23,
    color: cores.texto
  }
});
