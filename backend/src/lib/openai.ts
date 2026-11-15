import OpenAI, { AzureOpenAI } from 'openai';
import { env } from '../config/env';

const useAzure = env.AI_PROVIDER === 'azure';

function createAzureClient(endpoint?: string, apiKey?: string): OpenAI {
  // O AzureOpenAI tem a mesma interface do cliente da OpenAI: os serviços não mudam.
  // Ele usa o campo "model" de cada chamada como nome do deployment no Azure.
  return new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: env.AZURE_OPENAI_API_VERSION
  });
}

// Cliente da interpretação da fala e do assistente.
export const openai: OpenAI = useAzure
  ? createAzureClient(env.AZURE_OPENAI_ENDPOINT, env.AZURE_OPENAI_API_KEY)
  : new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Cliente da transcrição. No Azure, pode ficar em outro recurso, quando a região do recurso
// principal não oferece o modelo de transcrição.
export const transcriptionClient: OpenAI =
  useAzure && env.AZURE_OPENAI_TRANSCRIPTION_ENDPOINT
    ? createAzureClient(
        env.AZURE_OPENAI_TRANSCRIPTION_ENDPOINT,
        env.AZURE_OPENAI_TRANSCRIPTION_API_KEY ?? env.AZURE_OPENAI_API_KEY
      )
    : openai;

// Valor a passar em "model": nome do deployment no Azure ou nome do modelo na OpenAI.
export const aiModels = {
  transcription: useAzure
    ? env.AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT
    : env.OPENAI_TRANSCRIPTION_MODEL,
  llm: useAzure ? env.AZURE_OPENAI_LLM_DEPLOYMENT : env.OPENAI_LLM_MODEL
};
