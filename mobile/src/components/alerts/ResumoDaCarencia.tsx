import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAlertas } from '../../hooks/useCarencia';
import { cores } from '../../lib/constants';

// Na tela inicial: chama atenção para o que não pode colher e para a bula que falta.
export function ResumoDaCarencia() {
  const router = useRouter();
  const { data } = useAlertas();
  const emCarencia = (data ?? []).filter((a) => a.estado === 'em_carencia').length;
  const semCarencia = (data ?? []).filter((a) => a.estado === 'sem_carencia').length;

  if (emCarencia === 0 && semCarencia === 0) return null;

  const titulo =
    emCarencia > 0
      ? emCarencia === 1
        ? '1 aplicação ainda em carência'
        : `${emCarencia} aplicações ainda em carência`
      : semCarencia === 1
        ? 'Falta a carência de 1 aplicação'
        : `Falta a carência de ${semCarencia} aplicações`;

  const texto =
    emCarencia > 0
      ? 'Veja até quando não pode colher.'
      : 'Anote o número da bula para o AgroBot avisar quando pode colher.';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${texto} Toque para abrir os alertas.`}
      onPress={() => router.push('/alerts')}
      style={({ pressed }) => [
        styles.cartao,
        emCarencia > 0 ? styles.emCarencia : styles.semCarencia,
        pressed && styles.pressionado
      ]}
    >
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>{texto} Toque para ver ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: 14,
    borderLeftWidth: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24
  },
  emCarencia: {
    backgroundColor: cores.erroFundo,
    borderColor: cores.erro
  },
  semCarencia: {
    backgroundColor: cores.alertaFundo,
    borderColor: cores.alerta
  },
  pressionado: {
    opacity: 0.8
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: cores.texto,
    marginBottom: 4
  },
  texto: {
    fontSize: 17,
    lineHeight: 24,
    color: cores.texto
  }
});
