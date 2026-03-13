import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser } from '../services/supabaseClient'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      initialize: async () => {
        try {
          set({ loading: true })
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const user = await getCurrentUser()
            set({ session, user, loading: false })
          } else {
            set({ session: null, user: null, loading: false })
          }
        } catch (error) {
          console.error('Auth initialization failed:', error)
          set({ session: null, user: null, loading: false })
        }
      },

      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates }
      })),

      logout: () => set({ user: null, session: null }),
    }),
    {
      name: 'vangapalagalam-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
)

// Listen to auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState()
  if (event === 'SIGNED_IN' && session) {
    store.setSession(session)
    try {
      const user = await getCurrentUser()
      store.setUser(user)
    } catch (error) {
      console.error('Failed to fetch user on auth change:', error)
    }
  } else if (event === 'SIGNED_OUT') {
    store.logout()
  }
})
