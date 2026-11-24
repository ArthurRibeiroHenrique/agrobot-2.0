export const APP_NAME = 'AgroBot 2.0';
export const IDIOMA_PADRAO = 'pt-BR';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/v1';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Textos e botões grandes: o público tem pouca familiaridade com telas.
// Contraste alto (texto suave acima de 8:1 sobre o fundo) para ler no sol do campo.
export const cores = {
  primaria: '#2E7D32',
  primariaEscura: '#1B5E20',
  fundo: '#F4F7F2',
  cartao: '#FFFFFF',
  texto: '#142016',
  textoSuave: '#3D4B3F',
  borda: '#AEBCAB',
  destaque: '#DCEDD8',
  alerta: '#B45309',
  alertaFundo: '#FEF3C7',
  erro: '#B91C1C',
  erroFundo: '#FDECEC',
  gravando: '#C62828',
  branco: '#FFFFFF'
};

// Ícone de cada assunto (Ionicons): ajuda quem lê pouco a achar o assunto pelo desenho.
export const TIPOS_DE_ATIVIDADE = [
  { valor: 'plantio', rotulo: 'Plantio', icone: 'leaf' },
  { valor: 'aplicacao', rotulo: 'Aplicação', icone: 'flask' },
  { valor: 'adubacao', rotulo: 'Adubação', icone: 'nutrition' },
  { valor: 'irrigacao', rotulo: 'Irrigação', icone: 'water' },
  { valor: 'colheita', rotulo: 'Colheita', icone: 'basket' },
  { valor: 'manejo', rotulo: 'Manejo', icone: 'construct' },
  { valor: 'custo', rotulo: 'Custo', icone: 'cash' },
  { valor: 'outro', rotulo: 'Outro', icone: 'ellipsis-horizontal-circle' }
] as const;

// Página pública da política de privacidade (GitHub Pages, pasta site/ do repositório).
export const POLITICA_DE_PRIVACIDADE_URL =
  'https://arthurribeirohenrique.github.io/agrobot-2.0/privacidade/';
