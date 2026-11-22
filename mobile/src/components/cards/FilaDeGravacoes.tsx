import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSyncQueue } from '../../hooks/useSyncQueue';
import { cores } from '../../lib/constants';
import { descartarDaFila } from '../../services/filaOffline';
import type { GravacaoNaFila } from '../../store/offlineStore';
import { BotaoGrande } from '../ui/BotaoGrande';

// "Gravada hoje às 14:32", "Gravada ontem às 09:10" ou "Gravada em 18/11 às 17:00".
function quandoFoiGravada(item: GravacaoNaFila): string {
  const data = new Date(item.gravadaEm);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (d: Date) => d.toLocaleDateString('pt-BR');
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  if (dia(data) === dia(hoje)) return `Gravada hoje às ${hora}`;
  if (dia(data) === dia(ontem)) return `Gravada ontem às ${hora}`;

  return `Gravada em ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}

function confirmarDescarte(item: GravacaoNaFila) {
  Alert.alert('Descartar gravação?', 'O áudio guardado no celular será apagado.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Descartar', style: 'destructive', onPress: () => descartarDaFila(item.clientId) }
  ]);
}

export function FilaDeGravacoes() {
  const router = useRouter();
  const { aguardando, recusadas, paraConferir, sincronizando, sincronizar } = useSyncQueue();

  if (aguardando.length + recusadas.length + paraConferir.length === 0) return null;

  return (
    <View style={styles.bloco}>
      {paraConferir.length > 0 ? (
        <>
          <Text style={styles.titulo}>
            {paraConferir.length === 1 ? 'Gravação para conferir' : 'Gravações para conferir'}
          </Text>
          {paraConferir.map((item) => (
            <Pressable
              key={item.clientId}
              accessibilityRole="button"
              accessibilityLabel={`Conferir gravação. ${quandoFoiGravada(item)}`}
              onPress={() =>
                item.jobId &&
                router.push({ pathname: '/activity/confirm-draft', params: { id: item.jobId } })
              }
              style={({ pressed }) => [styles.cartao, styles.conferir, pressed && styles.pressionado]}
            >
              <Text style={styles.cartaoTitulo}>{quandoFoiGravada(item)}</Text>
              <Text style={styles.cartaoTexto}>Toque para conferir e salvar no diário.</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {aguardando.length > 0 ? (
        <View style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>
            {aguardando.length === 1
              ? '1 gravação esperando internet'
              : `${aguardando.length} gravações esperando internet`}
          </Text>
          <Text style={styles.cartaoTexto}>
            Estão guardadas no celular e serão enviadas sozinhas quando o sinal voltar.
          </Text>
          {aguardando.map((item) => (
            <Text key={item.clientId} style={styles.linha}>
              • {quandoFoiGravada(item)}
            </Text>
          ))}
          <View style={styles.espaco} />
          <BotaoGrande
            texto="Tentar enviar agora"
            variante="secundario"
            carregando={sincronizando}
            onPress={() => void sincronizar()}
          />
        </View>
      ) : null}

      {recusadas.map((item) => (
        <View key={item.clientId} style={[styles.cartao, styles.recusada]}>
          <Text style={styles.cartaoTitulo}>{quandoFoiGravada(item)}: não foi aceita</Text>
          <Text style={styles.cartaoTexto}>{item.erro ?? 'O servidor não aceitou este áudio.'}</Text>
          <View style={styles.espaco} />
          <BotaoGrande
            texto="Descartar"
            variante="secundario"
            onPress={() => confirmarDescarte(item)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    marginBottom: 24
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 8
  },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    marginBottom: 12
  },
  conferir: {
    borderWidth: 2,
    borderColor: cores.primaria
  },
  recusada: {
    borderColor: cores.erro
  },
  pressionado: {
    opacity: 0.8
  },
  cartaoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.primariaEscura,
    marginBottom: 4
  },
  cartaoTexto: {
    fontSize: 16,
    lineHeight: 22,
    color: cores.textoSuave
  },
  linha: {
    fontSize: 16,
    color: cores.texto,
    marginTop: 4
  },
  espaco: {
    height: 12
  }
});
