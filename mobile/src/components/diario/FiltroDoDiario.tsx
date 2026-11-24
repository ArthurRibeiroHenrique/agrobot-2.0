import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, TIPOS_DE_ATIVIDADE } from '../../lib/constants';
import type { Resumo } from '../../types';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

type Props = {
  assunto: string | null;
  resumo: Resumo | undefined;
  onChange: (assunto: string | null) => void;
};

// Botões grandes com desenho, nome e quantos registros tem. Todos ficam à vista (quebram linha
// em vez de rolar para o lado), para ninguém deixar de ver um assunto escondido.
export function FiltroDoDiario({ assunto, resumo, onChange }: Props) {
  const quantidades = new Map(resumo?.por_tipo.map((item) => [item.tipo, item.quantidade]));

  // Só os assuntos que já têm registro; enquanto o resumo não chega, mostra todos.
  const assuntos = TIPOS_DE_ATIVIDADE.filter(
    (tipo) => !resumo || quantidades.has(tipo.valor) || tipo.valor === assunto
  );

  // Com um assunto só, não há o que filtrar.
  if (resumo && assuntos.length <= 1 && !assunto) return null;

  const opcoes = [
    { valor: null, rotulo: 'Tudo', icone: 'albums', quantidade: resumo?.total },
    ...assuntos.map((tipo) => ({
      valor: tipo.valor as string | null,
      rotulo: tipo.rotulo as string,
      icone: tipo.icone as string,
      quantidade: resumo ? (quantidades.get(tipo.valor) ?? 0) : undefined
    }))
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>O que você quer ver?</Text>
      <View style={styles.lista}>
        {opcoes.map((opcao) => {
          const selecionada = opcao.valor === assunto;

          return (
            <Pressable
              key={opcao.valor ?? 'tudo'}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionada }}
              accessibilityLabel={
                opcao.quantidade !== undefined
                  ? `${opcao.rotulo}, ${opcao.quantidade} registros`
                  : opcao.rotulo
              }
              onPress={() => onChange(opcao.valor)}
              style={({ pressed }) => [
                styles.opcao,
                selecionada && styles.opcaoSelecionada,
                pressed && !selecionada && styles.pressionada
              ]}
            >
              <Ionicons
                name={opcao.icone as NomeDoIcone}
                size={20}
                color={selecionada ? cores.branco : cores.primariaEscura}
              />
              <Text style={[styles.texto, selecionada && styles.textoSelecionado]}>
                {opcao.rotulo}
                {opcao.quantidade !== undefined ? ` (${opcao.quantidade})` : ''}
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
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 10
  },
  lista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  opcao: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.cartao
  },
  opcaoSelecionada: {
    borderColor: cores.primaria,
    backgroundColor: cores.primaria
  },
  pressionada: {
    backgroundColor: cores.destaque
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
