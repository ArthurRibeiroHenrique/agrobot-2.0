import { Redirect } from 'expo-router';

import { useAuthStore } from '../store/authStore';

// A rota inicial "/" é a aba Início, que só existe para quem está logado. Sem login (por exemplo,
// logo depois de instalar o APK), o app abria em "agrobot:///" e mostrava "Unmatched Route".
// Qualquer endereço sem tela leva ao login ou ao início, conforme a sessão.
export default function NaoEncontrada() {
  const logado = useAuthStore((state) => state.session !== null);

  return <Redirect href={logado ? '/' : '/login'} />;
}
