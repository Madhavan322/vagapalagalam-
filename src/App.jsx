import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './context/authStore'

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
