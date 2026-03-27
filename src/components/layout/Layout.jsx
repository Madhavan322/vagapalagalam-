import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Compass, Play, MessageSquare, Bell, User, Plus, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Play, label: 'Reels', path: '/reels' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [theme, setTheme] = useState('dark')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('vaga-theme')
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('vaga-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!user) return
    const msgSub = supabase.channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => setUnreadMessages(prev => prev + 1))
      .subscribe()

    return () => { supabase.removeChannel(msgSub) }
  }, [user])

  const isReels = location.pathname.startsWith('/reels')
  const isChat = location.pathname.startsWith('/messages/') && location.pathname.split('/').length > 2
  const hideNav = isReels || isChat

  return (
    <div className="min-h-screen bg-void bg-grid relative overflow-x-hidden">
      <button
        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 z-50 px-3 py-2 rounded-xl border border-white/20 shadow-lg backdrop-blur bg-black/30 text-sm font-medium text-white/90 hover:bg-white/20 transition-all"
        aria-label="Toggle dark/light theme"
      >
        {theme === 'dark' ? <Sun size={16} className="inline mr-1" /> : <Moon size={16} className="inline mr-1" />}
        {theme === 'dark' ? 'Light' : 'Dark'} mode
      </button>
      {/* Main content */}
      <main className={`${hideNav ? '' : 'pb-24 pt-4 px-4 max-w-2xl mx-auto'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Create button - floating */}
      {!hideNav && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => navigate('/create')}
          className="fixed bottom-28 right-4 z-50 w-13 h-13 rounded-full flex items-center justify-center btn-gradient"
          style={{
            width: '52px',
            height: '52px',
            boxShadow: '0 4px 20px var(--glow-primary), 0 0 40px rgba(0, 245, 255, 0.2)'
          }}
        >
          <Plus size={22} className="text-white" />
        </motion.button>
      )}

      {/* Bottom navigation dock */}
      {!hideNav && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="nav-dock flex items-center justify-around gap-1 px-3 py-2"
          >
            {navItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path || 
                (path === '/profile' && location.pathname.startsWith('/profile'))
              const hasBadge = (path === '/messages' && unreadMessages > 0) ||
                (path === '/notifications' && unreadNotifs > 0)

              return (
                <motion.button
                  key={path}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(path)}
                  className="relative flex flex-col items-center p-2 rounded-xl transition-all duration-200 group"
                  style={{
                    background: isActive ? 'rgba(0, 245, 255, 0.1)' : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                      filter: isActive ? 'drop-shadow(0 0 8px var(--glow-primary))' : 'none',
                    }}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--glow-primary)' }}
                    />
                  )}
                  {hasBadge && (
                    <div className="absolute top-1 right-1 notif-dot" />
                  )}
                </motion.button>
              )
            })}
          </motion.nav>
        </div>
      )}
    </div>
  )
}
