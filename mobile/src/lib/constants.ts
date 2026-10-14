export const APP_NAME = 'AgroBot 2.0';
export const IDIOMA_PADRAO = 'pt-BR';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/v1';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Textos e botões grandes: o público tem pouca familiaridade com telas.
export const cores = {
  primaria: '#2E7D32',
  primariaEscura: '#1B5E20',
  fundo: '#F4F7F2',
  cartao: '#FFFFFF',
  texto: '#1C2B1E',
  textoSuave: '#5B6B5D',
  borda: '#D5DDD3',
  alerta: '#B45309',
  alertaFundo: '#FEF3C7',
  erro: '#B91C1C',
  gravando: '#C62828',
  branco: '#FFFFFF'
};

export const TIPOS_DE_ATIVIDADE = [
  { valor: 'plantio', rotulo: 'Plantio' },
  { valor: 'aplicacao', rotulo: 'Aplicação' },
  { valor: 'adubacao', rotulo: 'Adubação' },
  { valor: 'irrigacao', rotulo: 'Irrigação' },
  { valor: 'colheita', rotulo: 'Colheita' },
  { valor: 'manejo', rotulo: 'Manejo' },
  { valor: 'custo', rotulo: 'Custo' },
  { valor: 'outro', rotulo: 'Outro' }
];
