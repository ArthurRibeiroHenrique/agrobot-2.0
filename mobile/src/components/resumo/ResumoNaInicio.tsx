import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useResumo } from '../../hooks/useActivities';
import { cores } from '../../lib/constants';
import {
  formatarData,
  formatarDinheiroRedondo,
  iconeDoTipo,
  plural,
  rotuloDoTipo
} from '../../lib/format';
import { LinhaComBarra } from './LinhaComBarra';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

// Quantos serviços aparecem em barras na tela inicial; o resto fica no resumo completo.
const SERVICOS_NA_INICIO = 3;

// No topo da tela inicial: três números grandes sobre todo o diário, as barras dos serviços mais
// feitos e o caminho para o resumo completo.
export function ResumoNaInicio() {
  const router = useRouter();
  const { data: resumo } = useResumo();

  // Sem registros, o cartão "Último registro" já explica o que fazer.
  if (!resumo || resumo.total === 0) return null;

  const numeros = [
    { valor: String(resumo.total), legenda: resumo.total === 1 ? 'registro\nno total' : 'registros\nno total' },
    { valor: String(resumo.este_mes), legenda: resumo.este_mes === 1 ? 'registro\neste mês' : 'registros\neste mês' }
  ];

  if (resumo.gastos.total > 0) {
    numeros.push({ valor: formatarDinheiroRedondo(resumo.gastos.total), legenda: 'de gastos\nanotados' });
  }

  const servicos = resumo.por_tipo.slice(0, SERVICOS_NA_INICIO);
  const maiorServico = Math.max(1, ...servicos.map((item) => item.quantidade));

  const desde = resumo.primeiro_registro ? `Desde ${formatarData(resumo.primeiro_registro)}` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Resumo da sua roça. ${desde}. ${numeros
        .map((n) => `${n.valor} ${n.legenda.replace('\n', ' ')}`)
        .join('. ')}. Toque para ver o resumo completo.`}
      onPress={() => router.push('/resumo')}
      style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
    >
      <View style={styles.cabecalho}>
        <Ionicons name="stats-chart" size={24} color={cores.primariaEscura} />
        <Text style={styles.titulo}>Resumo da sua roça</Text>
      </View>
      {desde ? <Text style={styles.desde}>{desde}</Text> : null}

      <View style={styles.numeros}>
        {numeros.map((numero) => (
          <View key={numero.legenda} style={styles.numero}>
            <Text style={styles.valor} adjustsFontSizeToFit numberOfLines={1}>
              {numero.valor}
            </Text>
            <Text style={styles.legenda}>{numero.legenda}</Text>
          </View>
        ))}
      </View>

      {servicos.length > 0 ? (
        <View style={styles.servicos}>
          <Text style={styles.subtitulo}>O que você mais fez</Text>
          {servicos.map((item) => (
            <LinhaComBarra
              key={item.tipo}
              icone={iconeDoTipo(item.tipo) as NomeDoIcone}
              rotulo={rotuloDoTipo(item.tipo)}
              valor={plural(item.quantidade, 'vez', 'vezes')}
              proporcao={item.quantidade / maiorServico}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.link}>Ver o resumo completo ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    marginBottom: 24
  },
  pressionado: {
    opacity: 0.8
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: cores.texto
  },
  desde: {
    fontSize: 16,
    color: cores.textoSuave,
    marginTop: 2
  },
  numeros: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 12
  },
  numero: {
    flex: 1,
    backgroundColor: cores.destaque,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center'
  },
  valor: {
    fontSize: 28,
    fontWeight: '800',
    color: cores.primariaEscura
  },
  legenda: {
    fontSize: 15,
    lineHeight: 19,
    color: cores.texto,
    textAlign: 'center',
    marginTop: 2
  },
  servicos: {
    marginBottom: 12
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 2
  },
  link: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.primariaEscura
  }
});
