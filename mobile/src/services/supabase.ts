import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/constants';

// O texto de exemplo do .env.example ("COLE_A_URL...") também conta como não configurado.
const urlValida = /^https?:\/\//.test(SUPABASE_URL);

export const supabaseConfigurado = urlValida && Boolean(SUPABASE_ANON_KEY);

// Valores de reserva só evitam erro ao abrir o app sem .env; a tela de login avisa.
export const supabase = createClient(
  supabaseConfigurado ? SUPABASE_URL : 'http://localhost:54321',
  supabaseConfigurado ? SUPABASE_ANON_KEY : 'chave-nao-configurada',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

// O token só é renovado com o app em primeiro plano.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
