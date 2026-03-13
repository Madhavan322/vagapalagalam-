import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Compass, Play, MessageSquare, Bell, User, Plus } from 'lucide-react'
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
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    if (!user) return
    // Subscribe to new messages
    const msgSub = supabase.channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => setUnreadMessages(prev => prev + 1))
      .subscribe()

    return () => { supabase.removeChannel(msgSub) }
  }, [user])

  const isReels = location.pathname === '/reels'

  return (
    <div className="min-h-screen bg-void bg-grid relative">
      {/* Main content */}
      <main className={`${isReels ? '' : 'pb-24 pt-4 px-4 max-w-2xl mx-auto'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Create button - floating */}
      {!isReels && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/create')}
          className="fixed bottom-28 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            boxShadow: '0 0 20px rgba(0,245,255,0.4)'
          }}
        >
          <Plus size={22} className="text-void" />
        </motion.button>
      )}

      {/* Bottom navigation dock */}
      {!isReels && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="nav-dock flex items-center gap-1 px-3 py-2"
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
                    background: isActive ? 'rgba(0,245,255,0.1)' : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      color: isActive ? 'var(--neon-cyan)' : 'rgba(224,224,255,0.4)',
                      filter: isActive ? 'drop-shadow(0 0 6px var(--neon-cyan))' : 'none',
                    }}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 w-1 h-1 rounded-full"
                      style={{ background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }}
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
