import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Erro, Paragrafo, Tela, Titulo } from '../components/ui/Tela';
import { useResumo } from '../hooks/useActivities';
import { cores } from '../lib/constants';
import {
  formatarData,
  formatarDinheiroRedondo,
  formatarNumero,
  iconeDoTipo,
  plural,
  rotuloDoTipo
} from '../lib/format';
import { mensagemDeErro } from '../services/api';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

// Resumo de todo o diário, para quem não está acostumado com gráficos: frases curtas, números
// grandes e barras simples, onde a barra maior é a que tem mais registros. Sem porcentagem.
export default function ResumoScreen() {
  const router = useRouter();
  const { data: resumo, isLoading, error, refetch, isRefetching } = useResumo();

  if (isLoading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  if (error || !resumo) {
    return (
      <Tela>
        <Erro>{mensagemDeErro(error)}</Erro>
        <Pressable
          accessibilityRole="button"
          onPress={() => refetch()}
          disabled={isRefetching}
          style={styles.botaoTentar}
        >
          <Text style={styles.botaoTentarTexto}>Tentar de novo</Text>
        </Pressable>
      </Tela>
    );
  }

  if (resumo.total === 0) {
    return (
      <Tela>
        <Titulo>Seu diário ainda está vazio</Titulo>
        <Paragrafo>
          Quando você registrar o que fez na roça, o resumo aparece aqui: quantos serviços, o que
          mais usou, em quais talhões e quanto gastou.
        </Paragrafo>
      </Tela>
    );
  }

  const maiorTipo = Math.max(...resumo.por_tipo.map((item) => item.quantidade));
  const maiorTalhao = Math.max(1, ...resumo.talhoes.map((item) => item.quantidade));

  return (
    <Tela>
      <Titulo>Tudo o que você anotou</Titulo>
      <Paragrafo>
        {resumo.primeiro_registro
          ? `Desde ${formatarData(resumo.primeiro_registro)}, você fez ${plural(resumo.total, 'registro', 'registros')} no diário.`
          : `Você fez ${plural(resumo.total, 'registro', 'registros')} no diário.`}{' '}
        {resumo.este_mes > 0
          ? `Este mês foram ${resumo.este_mes}.`
          : 'Este mês ainda não tem nenhum.'}
      </Paragrafo>

      <Secao icone="list" titulo="Serviços que você fez">
        <Text style={styles.dica}>Toque num serviço para ver esses registros no diário.</Text>
        {resumo.por_tipo.map((item) => (
          <Pressable
            key={item.tipo}
            accessibilityRole="button"
            accessibilityLabel={`${rotuloDoTipo(item.tipo)}: ${plural(item.quantidade, 'vez', 'vezes')}. Toque para ver no diário.`}
            onPress={() => router.navigate({ pathname: '/diary', params: { assunto: item.tipo } })}
            style={({ pressed }) => [styles.linhaTocavel, pressed && styles.pressionado]}
          >
            <LinhaComBarra
              icone={iconeDoTipo(item.tipo) as NomeDoIcone}
              rotulo={rotuloDoTipo(item.tipo)}
              valor={plural(item.quantidade, 'vez', 'vezes')}
              proporcao={item.quantidade / maiorTipo}
              seta
            />
          </Pressable>
        ))}
      </Secao>

      {resumo.produtos.length > 0 ? (
        <Secao icone="flask" titulo="Produtos que você mais usou">
          {resumo.produtos.map((produto) => (
            <View key={`${produto.tipo}-${produto.produto}`} style={styles.produto}>
              <Text style={styles.produtoNome}>{produto.produto}</Text>
              <Text style={styles.produtoDetalhe}>
                {rotuloDoTipo(produto.tipo)}  •  {plural(produto.vezes, 'vez', 'vezes')}
              </Text>
              {produto.totais.length > 0 ? (
                <Text style={styles.produtoTotal}>
                  Total:{' '}
                  {produto.totais
                    .map((total) => `${formatarNumero(total.quantidade)} ${total.unidade ?? ''}`.trim())
                    .join(' e ')}
                </Text>
              ) : null}
            </View>
          ))}
        </Secao>
      ) : null}

      {resumo.talhoes.length > 0 ? (
        <Secao icone="map" titulo="Talhões com mais serviço">
          {resumo.talhoes.map((item) => (
            <LinhaComBarra
              key={item.talhao}
              icone="location"
              rotulo={item.talhao}
              valor={plural(item.quantidade, 'registro', 'registros')}
              proporcao={item.quantidade / maiorTalhao}
            />
          ))}
        </Secao>
      ) : null}

      {resumo.gastos.total > 0 ? (
        <Secao icone="cash" titulo="Gastos anotados">
          <View style={styles.gastos}>
            <View style={styles.gasto}>
              <Text style={styles.gastoValor} adjustsFontSizeToFit numberOfLines={1}>
                {formatarDinheiroRedondo(resumo.gastos.total)}
              </Text>
              <Text style={styles.gastoLegenda}>no total</Text>
            </View>
            <View style={styles.gasto}>
              <Text style={styles.gastoValor} adjustsFontSizeToFit numberOfLines={1}>
                {formatarDinheiroRedondo(resumo.gastos.este_mes)}
              </Text>
              <Text style={styles.gastoLegenda}>este mês</Text>
            </View>
          </View>
          <Text style={styles.dica}>
            Só entram os registros em que você falou quanto gastou.
          </Text>
        </Secao>
      ) : null}
    </Tela>
  );
}

function Secao({
  icone,
  titulo,
  children
}: {
  icone: NomeDoIcone;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.secao}>
      <View style={styles.secaoCabecalho}>
        <Ionicons name={icone} size={24} color={cores.primariaEscura} />
        <Text style={styles.secaoTitulo} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {children}
    </View>
  );
}

function LinhaComBarra({
  icone,
  rotulo,
  valor,
  proporcao,
  seta = false
}: {
  icone: NomeDoIcone;
  rotulo: string;
  valor: string;
  proporcao: number;
  seta?: boolean;
}) {
  return (
    <View style={styles.linha}>
      <View style={styles.linhaTopo}>
        <Ionicons name={icone} size={22} color={cores.primariaEscura} />
        <Text style={styles.linhaRotulo} numberOfLines={2}>
          {rotulo}
        </Text>
        <Text style={styles.linhaValor}>{valor}</Text>
        {seta ? <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} /> : null}
      </View>
      <View style={styles.trilho}>
        <View style={[styles.barra, { width: `${Math.max(4, Math.round(proporcao * 100))}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo
  },
  botaoTentar: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.cartao
  },
  botaoTentarTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.primariaEscura
  },
  secao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    marginBottom: 16
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  secaoTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: cores.texto,
    flexShrink: 1
  },
  dica: {
    fontSize: 16,
    lineHeight: 22,
    color: cores.textoSuave,
    marginBottom: 8
  },
  linhaTocavel: {
    borderRadius: 10
  },
  pressionado: {
    backgroundColor: cores.destaque
  },
  linha: {
    paddingVertical: 8
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  linhaRotulo: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto
  },
  linhaValor: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.primariaEscura
  },
  trilho: {
    height: 14,
    borderRadius: 7,
    backgroundColor: cores.fundo,
    borderWidth: 1,
    borderColor: cores.borda,
    overflow: 'hidden'
  },
  barra: {
    height: '100%',
    backgroundColor: cores.primaria,
    borderRadius: 7
  },
  produto: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: cores.destaque
  },
  produtoNome: {
    fontSize: 19,
    fontWeight: '800',
    color: cores.texto
  },
  produtoDetalhe: {
    fontSize: 16,
    color: cores.textoSuave,
    marginTop: 2
  },
  produtoTotal: {
    fontSize: 17,
    fontWeight: '600',
    color: cores.primariaEscura,
    marginTop: 4
  },
  gastos: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  gasto: {
    flex: 1,
    backgroundColor: cores.destaque,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center'
  },
  gastoValor: {
    fontSize: 26,
    fontWeight: '800',
    color: cores.primariaEscura
  },
  gastoLegenda: {
    fontSize: 16,
    color: cores.texto,
    marginTop: 2
  }
});
