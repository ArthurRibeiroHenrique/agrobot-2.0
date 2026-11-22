import { Directory, File, Paths } from 'expo-file-system';
import { getNetworkStateAsync } from 'expo-network';

import { esperarFilaCarregada, GravacaoNaFila, useOfflineStore } from '../store/offlineStore';
import { useAuthStore } from '../store/authStore';
import type { VoiceJob } from '../types';
import { ApiError, mensagemDeErro } from './api';
import { enviarGravacao, fusoDoAparelho, novoClientId } from './audio';

// O cache pode ser limpo pelo sistema com pouco espaço; a pasta de documentos, não.
const PASTA = new Directory(Paths.document, 'fila-de-gravacoes');

export type ResultadoDoEnvio =
  | { tipo: 'enviada'; job: VoiceJob }
  | { tipo: 'sem-conexao' }
  | { tipo: 'recusada'; erro: string };

function usuarioAtual(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}

function apagarArquivo(uri: string) {
  try {
    const arquivo = new File(uri);

    if (arquivo.exists) arquivo.delete();
  } catch {
    // Arquivo já apagado ou inacessível: não há o que fazer.
  }
}

// Guarda a gravação no celular antes de qualquer tentativa de envio. Assim ela não se perde
// se faltar sinal, se o servidor estiver fora ou se o app for fechado no meio do envio.
export async function guardarGravacao(uriOriginal: string): Promise<GravacaoNaFila> {
  const userId = usuarioAtual();

  if (!userId) throw new Error('Entre na sua conta para gravar.');

  const clientId = novoClientId();
  const original = new File(uriOriginal);
  // A extensão diz ao servidor o formato do áudio (m4a do gravador, opus do WhatsApp etc.).
  const extensao = original.extension || '.m4a';

  PASTA.create({ idempotent: true, intermediates: true });

  const destino = new File(PASTA, `${clientId}${extensao}`);

  await original.copy(destino);
  // O original fica no cache (gravador ou seletor de arquivos) e não é mais necessário.
  apagarArquivo(uriOriginal);

  const item: GravacaoNaFila = {
    clientId,
    userId,
    uri: destino.uri,
    gravadaEm: new Date().toISOString(),
    timezone: fusoDoAparelho(),
    estado: 'aguardando',
    tentativas: 0,
    erro: null,
    jobId: null
  };

  useOfflineStore.getState().adicionar(item);

  return item;
}

// Sem rede nenhuma, nem tenta: o envio só falharia depois do tempo limite.
async function semRede(): Promise<boolean> {
  try {
    const estado = await getNetworkStateAsync();

    return estado.isConnected === false || estado.isInternetReachable === false;
  } catch {
    return false;
  }
}

// Erros que passam sozinhos: sem sinal, servidor demorando ou fora, limite de uso, sessão vencida
// (o Supabase renova quando a internet volta). Os demais (formato, tamanho) não mudam ao repetir.
function erroPassageiro(erro: unknown): boolean {
  if (!(erro instanceof ApiError)) return true;

  return erro.status === 0 || erro.status === 401 || erro.status === 429 || erro.status >= 500;
}

const enviandoAgora = new Set<string>();

export async function enviarDaFila(item: GravacaoNaFila): Promise<ResultadoDoEnvio> {
  const { atualizar } = useOfflineStore.getState();

  // A mesma gravação pode ser disparada pela tela e pela sincronização ao mesmo tempo.
  if (enviandoAgora.has(item.clientId)) return { tipo: 'sem-conexao' };

  enviandoAgora.add(item.clientId);

  try {
    if (await semRede()) return { tipo: 'sem-conexao' };

    const job = await enviarGravacao(item);

    atualizar(item.clientId, { estado: 'enviada', jobId: job.id, erro: null });
    // O servidor já tem o áudio; a cópia local só ocupa espaço.
    apagarArquivo(item.uri);

    return { tipo: 'enviada', job };
  } catch (falha) {
    const erro = mensagemDeErro(falha);

    if (erroPassageiro(falha)) {
      atualizar(item.clientId, { tentativas: item.tentativas + 1, erro });
      return { tipo: 'sem-conexao' };
    }

    atualizar(item.clientId, { estado: 'recusada', erro });
    return { tipo: 'recusada', erro };
  } finally {
    enviandoAgora.delete(item.clientId);
  }
}

let sincronizando: Promise<number> | null = null;

// Envia, em ordem de gravação, tudo o que está aguardando. Devolve quantas foram enviadas.
export function sincronizarFila(): Promise<number> {
  if (!sincronizando) {
    sincronizando = (async () => {
      await esperarFilaCarregada();

      const userId = usuarioAtual();

      if (!userId) return 0;

      const pendentes = useOfflineStore
        .getState()
        .itens.filter((item) => item.userId === userId && item.estado === 'aguardando');

      let enviadas = 0;

      for (const item of pendentes) {
        const resultado = await enviarDaFila(item);

        // Sem conexão para uma, não vai ter para as outras: tenta de novo depois.
        if (resultado.tipo === 'sem-conexao') break;
        if (resultado.tipo === 'enviada') enviadas += 1;
      }

      return enviadas;
    })().finally(() => {
      sincronizando = null;
    });
  }

  return sincronizando;
}

// Tira da fila e apaga o áudio guardado, se ainda existir.
export function descartarDaFila(clientId: string) {
  const { itens, remover } = useOfflineStore.getState();
  const item = itens.find((atual) => atual.clientId === clientId);

  if (item) apagarArquivo(item.uri);
  remover(clientId);
}

// Exclusão de conta: nada da pessoa fica no aparelho.
export async function limparFilaDoUsuario(userId: string) {
  await esperarFilaCarregada();

  const { itens, removerDoUsuario } = useOfflineStore.getState();

  itens.filter((item) => item.userId === userId).forEach((item) => apagarArquivo(item.uri));
  removerDoUsuario(userId);
}
