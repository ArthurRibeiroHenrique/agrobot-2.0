import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { cores } from '../../lib/constants';

type Props = TextInputProps & {
  rotulo: string;
  // Destaca o campo que a IA não conseguiu preencher.
  faltando?: boolean;
};

export function Campo({ rotulo, faltando = false, style, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>
        {rotulo}
        {faltando ? <Text style={styles.aviso}>  •  confira</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={cores.textoSuave}
        style={[styles.input, faltando && styles.inputFaltando, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  rotulo: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.texto,
    marginBottom: 6
  },
  aviso: {
    color: cores.alerta
  },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: cores.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 19,
    color: cores.texto,
    backgroundColor: cores.cartao
  },
  inputFaltando: {
    borderColor: cores.alerta,
    backgroundColor: cores.alertaFundo
  }
});
