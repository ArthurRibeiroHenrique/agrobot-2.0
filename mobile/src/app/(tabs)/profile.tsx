import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { useDeleteAccount } from '../../hooks/useAccount';
import { sair, useAuth } from '../../hooks/useAuth';
import { POLITICA_DE_PRIVACIDADE_URL } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const excluirConta = useDeleteAccount();
  const [erro, setErro] = useState<string | null>(null);

  function abrirPolitica() {
    Linking.openURL(POLITICA_DE_PRIVACIDADE_URL).catch(() =>
      setErro('Não foi possível abrir a página. Verifique a internet.')
    );
  }

  // Duas confirmações: a exclusão apaga tudo e não tem como desfazer.
  function confirmarExclusao() {
    Alert.alert(
      'Excluir minha conta',
      'Vamos apagar a sua conta e todos os seus dados: registros do diário, gravações, ' +
        'propriedade, talhões, conversas com o assistente e compartilhamentos. ' +
        'Os registros que você criou no diário de outra pessoa também serão apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tem certeza?', 'Isso não pode ser desfeito.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Excluir tudo',
                style: 'destructive',
                onPress: async () => {
                  setErro(null);

                  try {
                    await excluirConta.mutateAsync();
                  } catch (falha) {
                    setErro(mensagemDeErro(falha));
                  }
                }
              }
            ])
        }
      ]
    );
  }

  return (
    <Tela>
      <Titulo>Meu perfil</Titulo>
      <Paragrafo>{user?.phone || user?.email || ''}</Paragrafo>

      <BotaoGrande
        texto="Minha propriedade e talhões"
        variante="secundario"
        onPress={() => router.push('/farm/setup')}
      />

      <View style={styles.espaco} />

      <BotaoGrande
        texto="Compartilhar meu diário"
        variante="secundario"
        onPress={() => router.push('/share')}
      />

      <View style={styles.espaco} />

      <BotaoGrande texto="Política de privacidade" variante="secundario" onPress={abrirPolitica} />

      <View style={styles.espaco} />

      <BotaoGrande texto="Sair" variante="secundario" onPress={sair} />

      <View style={styles.separador} />

      <Erro>{erro}</Erro>

      <BotaoGrande
        texto="Excluir minha conta"
        variante="secundario"
        onPress={confirmarExclusao}
        carregando={excluirConta.isPending}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  espaco: {
    height: 16
  },
  // Longe dos outros botões, para não ser tocado sem querer.
  separador: {
    height: 48
  }
});
