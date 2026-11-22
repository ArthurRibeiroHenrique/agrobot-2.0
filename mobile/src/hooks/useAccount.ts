import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiDelete } from '../services/api';
import { limparFilaDoUsuario } from '../services/filaOffline';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

// Exclusão definitiva da conta. Depois que o backend apaga o usuário, a sessão do
// aparelho deixa de valer: a saída é só local, porque o servidor já não conhece a conta.
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const userId = useAuthStore.getState().session?.user.id;

      await apiDelete('/account');
      // Gravações guardadas no aparelho também são dados da conta.
      if (userId) await limparFilaDoUsuario(userId);
      queryClient.clear();
      await supabase.auth.signOut({ scope: 'local' });
    }
  });
}
