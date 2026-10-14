import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useCreateField, useFields } from '../../hooks/useFarm';
import { cores } from '../../lib/constants';
import { formatarNumero, lerNumero } from '../../lib/format';
import { mensagemDeErro } from '../../services/api';

export default function FieldsScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const talhoes = useFields();
  const criar = useCreateField();

  const [nome, setNome] = useState('');
  const [cultura, setCultura] = useState('');
  const [area, setArea] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const daPropriedade = (talhoes.data ?? []).filter(
    (talhao) => talhao.farm_id === farmId
  );

  async function adicionar() {
    setErro(null);

    try {
      await criar.mutateAsync({
        farm_id: farmId,
        name: nome,
        crop: cultura,
        area_ha: lerNumero(area)
      });

      setNome('');
      setCultura('');
      setArea('');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  return (
    <Tela>
      {talhoes.isError ? <Erro>{mensagemDeErro(talhoes.error)}</Erro> : null}

      {daPropriedade.length === 0 && !talhoes.isLoading ? (
        <Paragrafo>
          Nenhum talhão cadastrado. Use o mesmo nome que você fala no dia a dia, como “Talhão 2” ou
          “Baixada”.
        </Paragrafo>
      ) : null}

      {daPropriedade.map((talhao) => (
        <View key={talhao.id} style={styles.cartao}>
          <Text style={styles.nome}>{talhao.name}</Text>
          <Text style={styles.detalhe}>
            {[
              talhao.crop,
              talhao.area_ha !== null ? `${formatarNumero(talhao.area_ha)} ha` : null
            ]
              .filter(Boolean)
              .join('  •  ')}
          </Text>
        </View>
      ))}

      <View style={styles.espaco} />
      <Titulo>Novo talhão</Titulo>

      <Campo rotulo="Nome do talhão" value={nome} onChangeText={setNome} />
      <Campo
        rotulo="Cultura (opcional)"
        value={cultura}
        onChangeText={setCultura}
        placeholder="soja, milho, feijão…"
      />
      <Campo
        rotulo="Área em hectares (opcional)"
        value={area}
        onChangeText={setArea}
        keyboardType="decimal-pad"
      />

      <Erro>{erro}</Erro>

      <BotaoGrande
        texto="Adicionar talhão"
        onPress={adicionar}
        carregando={criar.isPending}
        desabilitado={nome.trim().length === 0}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    marginBottom: 10
  },
  nome: {
    fontSize: 19,
    fontWeight: '700',
    color: cores.texto
  },
  detalhe: {
    fontSize: 16,
    color: cores.textoSuave,
    marginTop: 2
  },
  espaco: {
    height: 16
  }
});
