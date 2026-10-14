import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela } from '../../components/ui/Tela';
import { enviarCodigo } from '../../hooks/useAuth';
import { APP_NAME, cores } from '../../lib/constants';
import { mensagemDeErro } from '../../services/api';
import { supabaseConfigurado } from '../../services/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [contato, setContato] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(
    supabaseConfigurado
      ? null
      : 'Aplicativo sem configuração do Supabase. Preencha o arquivo .env.'
  );

  async function receberCodigo() {
    setErro(null);
    setEnviando(true);

    try {
      const destino = await enviarCodigo(contato);

      router.push({ pathname: '/otp', params: { contato: destino } });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <View style={styles.topo}>
        <Text style={styles.nome}>{APP_NAME}</Text>
        <Text style={styles.subtitulo}>Seu diário da lavoura, por voz</Text>
      </View>

      <Paragrafo>
        Digite seu celular com DDD ou seu e-mail. Vamos enviar um código para você entrar.
      </Paragrafo>

      <Campo
        rotulo="Celular ou e-mail"
        value={contato}
        onChangeText={setContato}
        placeholder="(49) 99999-9999"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={receberCodigo}
      />

      <Erro>{erro}</Erro>

      <BotaoGrande
        texto="Receber código"
        onPress={receberCodigo}
        carregando={enviando}
        desabilitado={contato.trim().length < 5}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40
  },
  nome: {
    fontSize: 36,
    fontWeight: '800',
    color: cores.primariaEscura
  },
  subtitulo: {
    fontSize: 18,
    color: cores.textoSuave,
    marginTop: 6
  }
});
