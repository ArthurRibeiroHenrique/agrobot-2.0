import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../../lib/constants';

type Opcao = {
  valor: string;
  rotulo: string;
};

type Props = {
  rotulo: string;
  opcoes: Opcao[];
  valor: string | null;
  onChange: (valor: string) => void;
  faltando?: boolean;
};

// Escolha por toque, sem digitação.
export function Opcoes({ rotulo, opcoes, valor, onChange, faltando = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>
        {rotulo}
        {faltando ? <Text style={styles.aviso}>  •  confira</Text> : null}
      </Text>
      <View style={styles.lista}>
        {opcoes.map((opcao) => {
          const selecionada = opcao.valor === valor;

          return (
            <Pressable
              key={opcao.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionada }}
              accessibilityLabel={opcao.rotulo}
              onPress={() => onChange(opcao.valor)}
              style={[styles.opcao, selecionada && styles.opcaoSelecionada]}
            >
              <Text style={[styles.texto, selecionada && styles.textoSelecionado]}>
                {opcao.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    marginBottom: 8
  },
  aviso: {
    color: cores.alerta
  },
  lista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  opcao: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.cartao
  },
  opcaoSelecionada: {
    borderColor: cores.primaria,
    backgroundColor: cores.primaria
  },
  texto: {
    fontSize: 17,
    color: cores.texto
  },
  textoSelecionado: {
    color: cores.branco,
    fontWeight: '700'
  }
});
