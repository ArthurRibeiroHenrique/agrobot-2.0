import { create } from 'zustand'; 
 
export const useAuthStore = create(function (set) { 
  return { 
    user: null, 
    setUser: function (user) { 
      set({ user: user }); 
    } 
  }; 
}); 
