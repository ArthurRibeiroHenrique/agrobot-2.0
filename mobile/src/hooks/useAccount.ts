import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiDelete } from '../services/api';
import { supabase } from '../services/supabase';

// Exclusão definitiva da conta. Depois que o backend apaga o usuário, a sessão do
// aparelho deixa de valer: a saída é só local, porque o servidor já não conhece a conta.
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiDelete('/account');
      queryClient.clear();
      await supabase.auth.signOut({ scope: 'local' });
    }
  });
}
