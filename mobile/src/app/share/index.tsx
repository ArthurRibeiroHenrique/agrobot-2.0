import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import {
  useLeaveSharedDiary,
  useShareDiary,
  useShares,
  useStopSharing
} from '../../hooks/useShares';
import { cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';
import type { SharePerson } from '../../types';

type PessoaProps = {
  pessoa: SharePerson;
  textoDoBotao: string;
  onRemover: () => void;
};

function Pessoa({ pessoa, textoDoBotao, onRemover }: PessoaProps) {
  return (
    <View style={styles.pessoa}>
      <Text style={styles.email} numberOfLines={1}>
        {pessoa.email ?? 'Conta sem e-mail'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${textoDoBotao}: ${pessoa.email ?? ''}`}
        onPress={onRemover}
        hitSlop={8}
        style={({ pressed }) => [styles.remover, pressed && styles.pressionado]}
      >
        <Text style={styles.removerTexto}>{textoDoBotao}</Text>
      </Pressable>
    </View>
  );
}

// Compartilhar é de mão única: a pessoa passa a ver e editar o meu diário, a minha
// propriedade e os meus talhões. Eu só vejo o dela se ela também compartilhar comigo.
export default function ShareScreen() {
  const compartilhamentos = useShares();
  const compartilhar = useShareDiary();
  const pararDeCompartilhar = useStopSharing();
  const sairDoDiario = useLeaveSharedDiary();

  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar() {
    const limpo = email.trim();

    if (!/^\S+@\S+\.\S+$/.test(limpo)) {
      setErro('Digite o e-mail que a pessoa usa para entrar no AgroBot.');
      return;
    }

    setErro(null);
    setAviso(null);

    try {
      await compartilhar.mutateAsync(limpo);
      setEmail('');
      setAviso(`Pronto! ${limpo} já pode ver e editar o seu diário.`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  function confirmar(titulo: string, mensagem: string, acao: () => Promise<unknown>) {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          setAviso(null);

          try {
            await acao();
          } catch (falha) {
            setErro(mensagemDeErro(falha));
          }
        }
      }
    ]);
  }

  const dados = compartilhamentos.data;

  return (
    <Tela>
      <Titulo>Compartilhar meu diário</Titulo>
      <Paragrafo>
        A pessoa vai ver e poder editar os seus registros, a sua propriedade e os seus talhões.
        Ela precisa já ter entrado no AgroBot ao menos uma vez.
      </Paragrafo>

      <Campo
        rotulo="E-mail da pessoa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="nome@exemplo.com"
        returnKeyType="send"
        onSubmitEditing={enviar}
      />

      <Erro>{erro}</Erro>
      {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

      <BotaoGrande texto="Compartilhar" onPress={enviar} carregando={compartilhar.isPending} />

      {compartilhamentos.isLoading ? (
        <ActivityIndicator style={styles.carregando} size="large" color={cores.primaria} />
      ) : compartilhamentos.isError ? (
        <View style={styles.secao}>
          <Erro>{mensagemDeErro(compartilhamentos.error)}</Erro>
          <BotaoGrande
            texto="Tentar de novo"
            variante="secundario"
            onPress={() => compartilhamentos.refetch()}
          />
        </View>
      ) : (
        <>
          <Text style={styles.secaoTitulo}>Quem vê o meu diário</Text>
          {dados?.shared_with.length ? (
            dados.shared_with.map((pessoa) => (
              <Pessoa
                key={pessoa.user_id}
                pessoa={pessoa}
                textoDoBotao="Parar"
                onRemover={() =>
                  confirmar(
                    'Parar de compartilhar?',
                    `${pessoa.email ?? 'Essa pessoa'} não vai mais ver o seu diário.`,
                    () => pararDeCompartilhar.mutateAsync(pessoa.user_id)
                  )
                }
              />
            ))
          ) : (
            <Text style={styles.vazio}>Você ainda não compartilhou com ninguém.</Text>
          )}

          <Text style={styles.secaoTitulo}>Diários que eu vejo</Text>
          {dados?.shared_by.length ? (
            dados.shared_by.map((pessoa) => (
              <Pessoa
                key={pessoa.user_id}
                pessoa={pessoa}
                textoDoBotao="Sair"
                onRemover={() =>
                  confirmar(
                    'Deixar de ver este diário?',
                    `Os registros de ${pessoa.email ?? 'essa pessoa'} vão sumir do seu diário. Para voltar, ela precisa compartilhar de novo.`,
                    () => sairDoDiario.mutateAsync(pessoa.user_id)
                  )
                }
              />
            ))
          ) : (
            <Text style={styles.vazio}>Ninguém compartilhou o diário com você.</Text>
          )}
        </>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  aviso: {
    fontSize: 16,
    lineHeight: 22,
    color: cores.primariaEscura,
    marginBottom: 12
  },
  carregando: {
    marginTop: 24
  },
  secao: {
    marginTop: 24
  },
  secaoTitulo: {
    fontSize: 19,
    fontWeight: '700',
    color: cores.primariaEscura,
    marginTop: 28,
    marginBottom: 10
  },
  vazio: {
    fontSize: 16,
    color: cores.textoSuave
  },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10
  },
  email: {
    flex: 1,
    fontSize: 17,
    color: cores.texto
  },
  remover: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: cores.erro
  },
  pressionado: {
    opacity: 0.6
  },
  removerTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.erro
  }
});
