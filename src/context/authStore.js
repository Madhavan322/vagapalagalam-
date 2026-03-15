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
        
        // If we have a session already (restored from storage by Zustand), don't block the UI
        const hasSession = !!get().session
        set({ initializing: true, loading: !hasSession })
        
        const timeoutInfo = setTimeout(() => {
          if (get().loading) {
            console.warn('Auth initialization force-timeout triggered (5s). Unblocking UI.')
            set({ loading: false, initializing: false, initialized: true })
          }
        }, 5000)

        try {
          // 1. Get the session with very aggressive timeout
          const { data: { session }, error } = await withRetry(
            () => withTimeout(supabase.auth.getSession(), 4000, 'Session check timed out'),
            1,
            500
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

      login: async (email, password) => {
        set({ initializing: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          
          set({ session: data.session })
          const user = await getCurrentUser()
          set({ user, loading: false })
          return data
        } finally {
          set({ initializing: false })
        }
      },

      register: async (email, password, username) => {
        set({ initializing: true })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
          })
          if (error) throw error
          
          if (data.session) {
            set({ session: data.session })
            const user = await getCurrentUser()
            set({ user, loading: false })
          }
          return data
        } finally {
          set({ initializing: false })
        }
      },

      logout: async () => {
        set({ initializing: true })
        try {
          await supabase.auth.signOut()
          set({ user: null, session: null, loading: false })
        } finally {
          set({ initializing: false })
        }
      },
    }),
    {
      name: 'vangapalagalam-auth',
      partialize: (state) => ({ session: state.session, user: state.user }),
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
