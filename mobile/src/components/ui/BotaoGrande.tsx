import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { cores } from '../../lib/constants';

type Props = {
  texto: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  carregando?: boolean;
  desabilitado?: boolean;
};

export function BotaoGrande({
  texto,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false
}: Props) {
  const secundario = variante === 'secundario';
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        secundario && styles.secundario,
        inativo && styles.inativo,
        pressed && styles.pressionado
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={secundario ? cores.primaria : cores.branco} />
      ) : (
        <Text style={[styles.texto, secundario && styles.textoSecundario]}>
          {texto}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 60,
    borderRadius: 14,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  secundario: {
    backgroundColor: cores.cartao,
    borderWidth: 2,
    borderColor: cores.primaria
  },
  inativo: {
    opacity: 0.5
  },
  pressionado: {
    opacity: 0.8
  },
  texto: {
    color: cores.branco,
    fontSize: 20,
    fontWeight: '700'
  },
  textoSecundario: {
    color: cores.primaria
  }
});
