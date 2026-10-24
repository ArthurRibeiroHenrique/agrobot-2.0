import { StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';
import { AvisoTecnico } from '../alerts/AvisoTecnico';

type Props = {
  pergunta?: string;
  resposta: string;
  precisaTecnico: boolean;
};

export function RespostaAssistente({ pergunta, resposta, precisaTecnico }: Props) {
  return (
    <View style={styles.cartao}>
      {pergunta ? <Text style={styles.pergunta}>{pergunta}</Text> : null}
      <Text style={styles.rotulo}>AgroBot responde</Text>
      <Text style={styles.resposta}>{resposta}</Text>
      {precisaTecnico ? <AvisoTecnico /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    marginBottom: 16
  },
  pergunta: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 10
  },
  rotulo: {
    fontSize: 14,
    color: cores.textoSuave,
    marginBottom: 4
  },
  resposta: {
    fontSize: 18,
    lineHeight: 26,
    color: cores.texto
  }
});
