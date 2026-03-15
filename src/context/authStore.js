import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser, withTimeout } from '../services/supabaseClient'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      initialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      initialize: async () => {
        if (get().initialized) return
        set({ initialized: true, loading: true })
        
        const timeoutInfo = setTimeout(() => {
          if (get().loading) {
            console.warn('Auth initialization timed out. Forcing UI unblock.')
            set({ loading: false })
          }
        }, 90000)

        try {
          // 1. Just get the session first - this is fast
          const { data: { session }, error } = await withTimeout(supabase.auth.getSession(), 60000)
          if (error) throw error

          if (session) {
            set({ session })
            
            // 2. Unblock UI immediately if session exists
            // Profile will load in the background
            set({ loading: false })
            
            // 3. Background profile fetch
            getCurrentUser().then(user => {
              if (user) set({ user })
            }).catch(err => {
              console.error('Background user fetch failed:', err)
            })
          } else {
            set({ session: null, user: null, loading: false })
          }
        } catch (error) {
          console.error('Auth initialization failed:', error)
          set({ session: null, user: null, loading: false })
        } finally {
          clearTimeout(timeoutInfo)
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
  
  // Only handle major events to avoid flickering during INITIAL_SESSION or redundant triggers
  if (event === 'SIGNED_IN' && session) {
    if (store.session?.access_token === session.access_token && store.user) return;
    
    store.setLoading(true)
    store.setSession(session)
    try {
      const user = await getCurrentUser()
      store.setUser(user)
    } catch (error) {
      console.error('Failed to fetch user on auth change:', error)
    } finally {
      store.setLoading(false)
    }
  } else if (event === 'SIGNED_OUT') {
    store.logout()
    store.setLoading(false)
  }
})
