import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './context/authStore'
import { isConfigMissing } from './services/supabaseClient'

// Pages
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Reels from './pages/Reels'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import StoryViewer from './pages/StoryViewer'
import PostCreator from './pages/PostCreator'
import Layout from './components/layout/Layout'
import LoadingScreen from './components/ui/LoadingScreen'

function ProtectedRoute({ children }) {
  const { session } = useAuthStore()
  const location = useLocation()
  
  if (!session) return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  const { initialize, loading } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loader" />}
      </AnimatePresence>
      
      {/* Resilience Fallback: Only show if session check itself failed significantly */}
      {!loading && !useAuthStore.getState().session && !isConfigMissing && location.pathname !== '/' && location.pathname !== '/auth' && (
        <div className="fixed inset-0 z-[100] bg-void flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">📡</div>
          <h2 className="font-display font-bold text-gradient mb-2">SIGNAL INTERRUPTED</h2>
          <p className="text-sm text-muted mb-6 max-w-xs">
            The neural link is unstable. Attempting to re-establish connection...
          </p>
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => initialize()}
              className="btn-gradient px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-display tracking-widest font-bold"
            >
              <RefreshCw size={14} /> RECONNECT
            </motion.button>
            <button 
              onClick={() => useAuthStore.setState({ loading: false })}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Skip and attempt entry
            </button>
          </div>
        </div>
      )}

      {/* Critical Fallback: Configuration Missing */}
      {isConfigMissing && (
        <div className="fixed inset-0 z-[110] bg-void flex flex-col items-center justify-center p-6 text-center border-t-2 border-accent-secondary/50">
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="font-display font-bold text-accent-secondary mb-2">DATABASE NOT CONNECTED</h2>
          <p className="text-sm text-muted mb-6 max-w-md">
            The application is alive, but it can't find your Supabase keys. You must add <code className="text-accent-primary">VITE_SUPABASE_URL</code> and <code className="text-accent-primary">VITE_SUPABASE_ANON_KEY</code> to your Vercel Environment Variables.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <a 
              href="https://vercel.com/docs/projects/environment-variables" 
              target="_blank" 
              className="btn-gradient px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-display tracking-widest font-bold"
            >
              LEARN HOW TO ADD KEYS
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Refresh page after adding
            </button>
          </div>
        </div>
      )}
      <div className="scan-line" />
      <div className="orb orb-cyan" style={{ width: '600px', height: '600px', top: '-200px', left: '-200px' }} />
      <div className="orb orb-purple" style={{ width: '500px', height: '500px', bottom: '-100px', right: '-100px' }} />
      <div className="orb orb-pink" style={{ width: '300px', height: '300px', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />

      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/story/:userId" element={<ProtectedRoute><StoryViewer /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/reels/:reelId" element={<Reels />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/create" element={<PostCreator />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(10,10,18,0.95)',
            color: '#e0e0ff',
            border: '1px solid rgba(0,245,255,0.2)',
            backdropFilter: 'blur(20px)',
            fontFamily: 'Syne, sans-serif',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#040408' } },
          error: { iconTheme: { primary: '#ff006e', secondary: '#040408' } },
        }}
      />
    </>
  )
}
