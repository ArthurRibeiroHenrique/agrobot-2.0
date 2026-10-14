import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { confirmarCodigo, enviarCodigo } from '../../hooks/useAuth';
import { mensagemDeErro } from '../../services/api';

export default function OtpScreen() {
  const { contato } = useLocalSearchParams<{ contato: string }>();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Ao confirmar, a sessão muda e o layout raiz leva para a tela inicial.
  async function entrar() {
    setErro(null);
    setEnviando(true);

    try {
      await confirmarCodigo(contato, codigo.trim());
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);

    try {
      await enviarCodigo(contato);
      setAviso('Enviamos um novo código.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  return (
    <Tela>
      <Titulo>Digite o código</Titulo>
      <Paragrafo>Enviamos um código para {contato}.</Paragrafo>

      <Campo
        rotulo="Código"
        value={codigo}
        onChangeText={setCodigo}
        keyboardType="number-pad"
        maxLength={8}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={entrar}
      />

      <Erro>{erro}</Erro>
      {aviso ? <Paragrafo>{aviso}</Paragrafo> : null}

      <BotaoGrande
        texto="Entrar"
        onPress={entrar}
        carregando={enviando}
        desabilitado={codigo.trim().length < 6}
      />
      <Paragrafo> </Paragrafo>
      <BotaoGrande texto="Enviar outro código" variante="secundario" onPress={reenviar} />
    </Tela>
  );
}
