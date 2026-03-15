import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser, withTimeout, withRetry } from '../services/supabaseClient'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      initialized: false,
      initializing: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      initialize: async () => {
        if (get().initialized || get().initializing) return
        set({ initializing: true, loading: true })
        
        const timeoutInfo = setTimeout(() => {
          if (get().loading) {
            console.warn('Auth initialization force-timeout triggered (15s). Unblocking UI.')
            set({ loading: false, initializing: false, initialized: true })
          }
        }, 15000)

        try {
          // 1. Get the session with aggressive timeout and retry
          const { data: { session }, error } = await withRetry(
            () => withTimeout(supabase.auth.getSession(), 10000, 'Session check timed out'),
            2,
            1000
          ).catch(err => {
            // If lock is stolen, just return null and let the other request handle it
            if (err.name === 'AbortError') return { data: { session: null }, error: null }
            throw err
          })

          if (error) throw error

          if (session) {
            set({ session })
            set({ loading: false })
            
            // Background profile fetch
            getCurrentUser().then(user => {
              if (user) set({ user })
            }).catch(err => {
              console.error('Background user fetch failed:', err)
            })
          } else {
            set({ session: null, user: null, loading: false })
          }

          // 3. Start listener ONLY after initial check is done
          setupAuthListener(set, get)
        } catch (error) {
          console.error('Auth initialization failed:', error)
          set({ session: null, user: null, loading: false })
        } finally {
          set({ initialized: true, initializing: false })
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

// Helper to setup listener once
let listenerStarted = false
function setupAuthListener(set, get) {
  if (listenerStarted) return
  listenerStarted = true

  supabase.auth.onAuthStateChange(async (event, session) => {
    const store = get()
    
    // Ignore events if we're in the middle of a manual login/logout to prevent collisions
    if (store.initializing) return;

    if (event === 'SIGNED_IN' && session) {
      if (store.session?.access_token === session.access_token && store.user) return;
      
      set({ session })
      try {
        const user = await getCurrentUser()
        if (user) set({ user })
      } catch (error) {
        console.error('Failed to fetch user on auth change:', error)
      }
    } else if (event === 'SIGNED_OUT') {
      set({ user: null, session: null, loading: false })
    }
  })
}
