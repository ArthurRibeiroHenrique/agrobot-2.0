import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler
} from 'expo-notifications';
import { Platform } from 'react-native';

import { formatarData } from '../lib/format';
import type { AlertaDeCarencia } from '../types';

const CANAL = 'carencia';
const TIPO = 'carencia';
// Hora do aviso no dia da liberação: cedo, antes de sair para a lavoura.
const HORA_DO_AVISO = 7;

// Com o app aberto, o aviso também aparece.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function prepararCanal() {
  if (Platform.OS !== 'android') return;

  await setNotificationChannelAsync(CANAL, {
    name: 'Carência liberada',
    description: 'Avisa no dia em que o talhão pode ser colhido depois de uma aplicação.',
    importance: AndroidImportance.HIGH
  });
}

export async function avisosPermitidos(): Promise<boolean> {
  return (await getPermissionsAsync()).granted;
}

// Pede só quando o produtor toca no botão, depois de entender para que serve.
export async function pedirPermissaoDeAvisos(): Promise<boolean> {
  await prepararCanal();

  const atual = await getPermissionsAsync();

  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;

  return (await requestPermissionsAsync()).granted;
}

async function cancelarAvisosDeCarencia() {
  const agendados = await getAllScheduledNotificationsAsync();

  await Promise.all(
    agendados
      .filter((aviso) => aviso.content.data?.tipo === TIPO)
      .map((aviso) => cancelScheduledNotificationAsync(aviso.identifier))
  );
}

function momentoDoAviso(liberaEm: string): Date {
  const [ano, mes, dia] = liberaEm.split('-').map(Number);

  // Data local do aparelho: 7h do dia da liberação no fuso do produtor.
  return new Date(ano, mes - 1, dia, HORA_DO_AVISO, 0, 0);
}

// Refaz os avisos a partir da lista atual: carência corrigida ou registro apagado não deixam
// aviso velho para trás. Os avisos ficam no aparelho e chegam mesmo sem internet.
export async function agendarAvisosDeCarencia(alertas: AlertaDeCarencia[]): Promise<void> {
  if (!(await avisosPermitidos())) return;

  await prepararCanal();
  await cancelarAvisosDeCarencia();

  const agora = Date.now();

  for (const alerta of alertas) {
    if (alerta.estado !== 'em_carencia') continue;

    const quando = momentoDoAviso(alerta.liberaEm);

    if (quando.getTime() <= agora) continue;

    const talhao = alerta.field_name ? `${alerta.field_name}` : 'Talhão';
    const produto = alerta.product ? ` do ${alerta.product}` : '';

    await scheduleNotificationAsync({
      identifier: `carencia-${alerta.activity_id}`,
      content: {
        title: `${talhao}: carência terminou`,
        body: `Acabou hoje a carência${produto} aplicado em ${formatarData(alerta.applied_at)}. Já pode colher.`,
        data: { tipo: TIPO, activity_id: alerta.activity_id }
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: CANAL
      }
    });
  }
}

// Ao sair ou excluir a conta: os avisos são da lavoura dessa pessoa.
export async function limparAvisosDeCarencia(): Promise<void> {
  await cancelarAvisosDeCarencia().catch(() => {});
}
