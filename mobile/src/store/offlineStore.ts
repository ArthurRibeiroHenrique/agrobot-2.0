import { create } from 'zustand'; 
 
export const useOfflineStore = create(function (set) { 
  return { 
    pendentes: [], 
    adicionarPendente: function (item) { 
      set(function (state) { 
        return { pendentes: state.pendentes.concat(item) }; 
      }); 
    } 
  }; 
}); 
