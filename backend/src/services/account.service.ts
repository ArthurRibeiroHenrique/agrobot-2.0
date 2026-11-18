import { env } from '../config/env';
import { supabaseAdmin } from '../lib/supabase';

// Cada chamada lista no máximo 100 arquivos; o limite de voltas evita laço infinito
// caso o Storage devolva sempre os mesmos arquivos.
const ARQUIVOS_POR_VOLTA = 100;
const MAXIMO_DE_VOLTAS = 50;

// Os áudios ficam em "<userId>/<arquivo>" no bucket. Normalmente já foram apagados
// depois do processamento, mas podem sobrar os de envios que falharam ou os guardados
// com KEEP_AUDIO_AFTER_PROCESSING=true.
async function removeUserAudios(userId: string): Promise<void> {
  const bucket = supabaseAdmin.storage.from(env.SUPABASE_AUDIO_BUCKET);

  for (let volta = 0; volta < MAXIMO_DE_VOLTAS; volta++) {
    const { data, error } = await bucket.list(userId, { limit: ARQUIVOS_POR_VOLTA });

    if (error) throw error;
    if (!data || data.length === 0) return;

    const { error: removeError } = await bucket.remove(
      data.map((arquivo) => `${userId}/${arquivo.name}`)
    );

    if (removeError) throw removeError;
  }

  throw new Error('Não foi possível apagar todos os áudios da conta');
}

// Exclusão definitiva, exigida pela LGPD e pela Play Store. Apaga primeiro os áudios:
// se falhar, a conta continua existindo e a pessoa pode tentar de novo. Depois apaga o
// usuário; o "on delete cascade" das tabelas leva junto gravações, registros, propriedades,
// talhões, conversas com o assistente e compartilhamentos.
export async function deleteAccount(userId: string): Promise<void> {
  await removeUserAudios(userId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) throw error;
}
