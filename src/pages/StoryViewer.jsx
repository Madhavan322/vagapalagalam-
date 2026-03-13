import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { formatDistanceToNow } from 'date-fns'

const STORY_DURATION = 5000

export default function StoryViewer() {
  const { userId } = useParams()
  const navigate   = useNavigate()

  const [stories,  setStories]  = useState([])
  const [index,    setIndex]    = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused,   setPaused]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  const intervalRef = useRef(null)
  const startTime   = useRef(null)
  const elapsed     = useRef(0)

  useEffect(() => { fetchStories() }, [userId])

  const fetchStories = async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('stories')
      .select('*, users(id, username, avatar)')
      .eq('user_id', userId)
      .gt('expires_at', now)
      .order('created_at', { ascending: true })
    setStories(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!stories.length || loading) return
    startTimer()
    return () => clearTimer()
  }, [index, stories, loading])

  const startTimer = () => {
    clearTimer()
    elapsed.current = 0
    startTime.current = Date.now()
    intervalRef.current = setInterval(() => {
      if (paused) return
      const spent = Date.now() - startTime.current + elapsed.current
      const pct   = Math.min((spent / STORY_DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) goNext()
    }, 50)
  }

  const clearTimer = () => {
    clearInterval(intervalRef.current)
    setProgress(0)
  }

  const goPrev = () => {
    if (index > 0) { setIndex(i => i - 1) }
    else navigate(-1)
  }

  const goNext = () => {
    if (index < stories.length - 1) { setIndex(i => i + 1) }
    else navigate(-1)
  }

  const togglePause = () => {
    if (paused) {
      startTime.current = Date.now()
    } else {
      elapsed.current += Date.now() - startTime.current
    }
    setPaused(p => !p)
  }

  if (loading) return (
    <div className="fixed inset-0 bg-void flex items-center justify-center z-50">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2 border-accent-primary/30"
        style={{ borderTopColor: 'var(--accent-primary)' }} />
    </div>
  )

  if (!stories.length) return (
    <div className="fixed inset-0 bg-void flex flex-col items-center justify-center z-50">
      <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>No active stories</p>
      <button onClick={() => navigate(-1)} className="btn-gradient px-6 py-3 rounded-xl font-semibold text-sm">GO BACK</button>
    </div>
  )

  const story = stories[index]
  const user  = story?.users

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full max-w-sm h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }} className="absolute inset-0">
            {story?.media_url ? (
              story.media_url.match(/\.(mp4|webm|ogg)$/i)
                ? <video src={story.media_url} className="w-full h-full object-cover" autoPlay loop muted={false} />
                : <img src={story.media_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-card))' }}>
                <p className="font-display text-2xl font-bold text-gradient text-center px-8">
                  {story?.caption || ''}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-10" />

        {/* Progress bars */}
        <div className="absolute top-4 left-3 right-3 flex gap-1.5 z-20">
          {stories.map((_, i) => (
            <div key={i} className="story-progress flex-1">
              <div className="story-progress-fill"
                style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute top-10 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="avatar-ring">
              <img src={user?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${user?.username}`}
                className="w-9 h-9 rounded-full object-cover" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{user?.username}</p>
              <p className="text-xs text-white/50 font-mono">
                {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={togglePause} className="text-white/70">
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button onClick={() => navigate(-1)} className="text-white/70">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 flex z-20">
          <button className="flex-1 h-full" onClick={goPrev} aria-label="Previous" />
          <button className="flex-1 h-full" onClick={goNext} aria-label="Next" />
        </div>

        {/* Navigation arrows */}
        {index > 0 && (
          <button onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center glass">
            <ChevronLeft size={18} style={{ color: 'var(--accent-primary)' }} />
          </button>
        )}
        {index < stories.length - 1 && (
          <button onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center glass">
            <ChevronRight size={18} style={{ color: 'var(--accent-primary)' }} />
          </button>
        )}
      </div>
    </div>
  )
}
