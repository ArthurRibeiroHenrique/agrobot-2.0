import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BotaoGrande } from '../../components/ui/BotaoGrande';
import { Campo } from '../../components/ui/Campo';
import { Erro, Paragrafo, Tela, Titulo } from '../../components/ui/Tela';
import { confirmarCodigo, enviarCodigo } from '../../hooks/useAuth';
import { mensagemDeErro } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function OtpScreen() {
  const router = useRouter();
  const contato = useAuthStore((state) => state.contatoPendente);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Ao confirmar, a sessão muda e o layout raiz leva para a tela inicial.
  async function entrar() {
    if (!contato) return;

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
    if (!contato) return;

    setErro(null);
    setAviso(null);

    try {
      await enviarCodigo(contato);
      setAviso('Enviamos um novo código.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  // Aberta sem passar pelo login (ex.: app recarregado nesta tela).
  if (!contato) {
    return (
      <Tela>
        <Titulo>Digite seu contato</Titulo>
        <Paragrafo>Volte e informe seu celular ou e-mail para receber o código.</Paragrafo>
        <BotaoGrande texto="Voltar" onPress={() => router.replace('/login')} />
      </Tela>
    );
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
