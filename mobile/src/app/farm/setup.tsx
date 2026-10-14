import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useCreateFarm, useFarms } from '../../hooks/useFarm';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';

export default function FarmSetupScreen() {
  const router = useRouter();
  const propriedades = useFarms();
  const criar = useCreateFarm();

  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);

    try {
      await criar.mutateAsync({ name: nome, city: cidade, state: estado });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  if (propriedades.isLoading) {
    return (
      <Tela rolagem={false}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </Tela>
    );
  }

  if (propriedades.isError) {
    return (
      <Tela>
        <Erro>{mensagemDeErro(propriedades.error)}</Erro>
        <BotaoGrande texto="Tentar de novo" onPress={() => propriedades.refetch()} />
      </Tela>
    );
  }

  const propriedade = propriedades.data?.[0];

  if (propriedade) {
    const local = [propriedade.city, propriedade.state].filter(Boolean).join(' - ');

    return (
      <Tela>
        <View style={styles.cartao}>
          <Text style={styles.nome}>{propriedade.name}</Text>
          {local ? <Text style={styles.local}>{local}</Text> : null}
        </View>

        <BotaoGrande
          texto="Ver e cadastrar talhões"
          onPress={() =>
            router.push({ pathname: '/farm/fields', params: { farmId: propriedade.id } })
          }
        />
      </Tela>
    );
  }

  return (
    <Tela>
      <Titulo>Cadastre sua propriedade</Titulo>
      <Paragrafo>
        Com a propriedade e os talhões cadastrados, o AgroBot entende melhor onde cada atividade
        foi feita.
      </Paragrafo>

      <Campo rotulo="Nome da propriedade" value={nome} onChangeText={setNome} />
      <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} />
      <Campo
        rotulo="Estado"
        value={estado}
        onChangeText={setEstado}
        autoCapitalize="characters"
        maxLength={2}
        placeholder="SC"
      />

      <Erro>{erro}</Erro>

      <BotaoGrande
        texto="Salvar"
        onPress={salvar}
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
    padding: 18,
    marginBottom: 20
  },
  nome: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.texto
  },
  local: {
    fontSize: 17,
    color: cores.textoSuave,
    marginTop: 4
  }
});
