import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';

type Props = {
  gravando: boolean;
  duracaoMs: number;
  desabilitado?: boolean;
  onPress: () => void;
};

function formatarDuracao(ms: number): string {
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);

  return `${minutos}:${String(segundos % 60).padStart(2, '0')}`;
}

// Um toque começa a gravar, outro toque termina.
export function GravadorVoz({ gravando, duracaoMs, desabilitado = false, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={gravando ? 'Parar gravação' : 'Começar a gravar'}
        disabled={desabilitado}
        onPress={onPress}
        style={({ pressed }) => [
          styles.botao,
          gravando && styles.botaoGravando,
          (pressed || desabilitado) && styles.pressionado
        ]}
      >
        <View style={gravando ? styles.iconeParar : styles.iconeGravar} />
      </Pressable>
      <Text style={styles.legenda}>
        {gravando ? 'Toque para terminar' : 'Toque para falar'}
      </Text>
      <Text style={styles.duracao}>{gravando ? formatarDuracao(duracaoMs) : ' '}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center'
  },
  botao: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6
  },
  botaoGravando: {
    backgroundColor: cores.gravando
  },
  pressionado: {
    opacity: 0.75
  },
  iconeGravar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: cores.branco
  },
  iconeParar: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: cores.branco
  },
  legenda: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.texto,
    marginTop: 20
  },
  duracao: {
    fontSize: 20,
    color: cores.textoSuave,
    marginTop: 6
  }
});
