import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cores } from '../../lib/constants';

type Props = {
  children: ReactNode;
  rolagem?: boolean;
};

export function Tela({ children, rolagem = true }: Props) {
  return (
    <SafeAreaView style={styles.area} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.area}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {rolagem ? (
          <ScrollView
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.area, styles.conteudo]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={styles.titulo}>{children}</Text>;
}

export function Paragrafo({ children }: { children: ReactNode }) {
  return <Text style={styles.paragrafo}>{children}</Text>;
}

export function Erro({ children }: { children: ReactNode }) {
  return children ? <Text style={styles.erro}>{children}</Text> : null;
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: cores.fundo
  },
  conteudo: {
    padding: 20,
    gap: 4
  },
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: cores.texto,
    marginBottom: 8
  },
  paragrafo: {
    fontSize: 17,
    lineHeight: 24,
    color: cores.textoSuave,
    marginBottom: 16
  },
  erro: {
    fontSize: 16,
    color: cores.erro,
    marginBottom: 12
  }
});
