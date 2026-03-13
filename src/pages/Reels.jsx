import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Volume2, VolumeX, ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'

function ReelItem({ reel, isActive }) {
  const { user } = useAuthStore()
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const [liked, setLiked] = useState(reel.user_liked || false)
  const [likeCount, setLikeCount] = useState(reel.like_count || 0)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [isActive])

  const handleLike = async () => {
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => c + (newLiked ? 1 : -1))
    if (newLiked) {
      await supabase.from('likes').insert({ user_id: user.id, post_id: reel.id })
    } else {
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: reel.id })
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/reels/${reel.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  return (
    <div className="reel-item relative flex items-center justify-center bg-void overflow-hidden">
      {/* Video */}
      {reel.media_url ? (
        <video
          ref={videoRef}
          src={reel.media_url}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={muted}
          preload="metadata"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-card))' }}>
          <p className="text-2xl font-display font-bold text-gradient text-center px-8">{reel.caption}</p>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMuted(m => !m)}
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
        >
          {muted ? <VolumeX size={16} style={{ color: 'var(--accent-primary)' }} /> 
                  : <Volume2 size={16} style={{ color: 'var(--accent-primary)' }} />}
        </motion.button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        <div className="flex items-center gap-2 mb-3">
          <img
            src={reel.users?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${reel.users?.username}`}
            className="w-9 h-9 rounded-full border-2"
            style={{ borderColor: 'var(--accent-primary)' }}
          />
          <span className="font-semibold text-white text-sm">{reel.users?.username}</span>
        </div>
        {reel.caption && (
          <p className="text-sm text-white/80 line-clamp-2">{reel.caption}</p>
        )}
      </div>

      {/* Side actions */}
      <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center z-10">
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart
            size={26}
            fill={liked ? 'var(--accent-secondary)' : 'none'}
            style={{ color: liked ? 'var(--accent-secondary)' : 'white', filter: liked ? 'drop-shadow(0 0 8px var(--glow-secondary))' : 'none' }}
          />
          <span className="text-white text-xs font-mono">{likeCount}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle size={26} className="text-white" />
          <span className="text-white text-xs font-mono">{reel.comments?.length || 0}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 size={26} className="text-white" />
          <span className="text-white text-xs font-mono">Share</span>
        </motion.button>
      </div>
    </div>
  )
}

export default function Reels() {
  const navigate = useNavigate()
  const { reelId } = useParams()
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    fetchReels()
  }, [])

  const fetchReels = async () => {
    let specificReel = null
    if (reelId) {
      const { data } = await supabase
        .from('posts')
        .select(`*, users(id, username, avatar), likes(user_id), comments(id)`)
        .eq('id', reelId)
        .single()
      if (data) specificReel = data
    }

    const { data } = await supabase
      .from('posts')
      .select(`*, users(id, username, avatar), likes(user_id), comments(id)`)
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(20)
    
    let fetchedReels = data || []
    if (specificReel) {
      fetchedReels = [specificReel, ...fetchedReels.filter(r => r.id !== specificReel.id)]
    }

    setReels(fetchedReels)
    setLoading(false)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / window.innerHeight)
      setActiveIndex(idx)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-void">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-accent-primary/30"
          style={{ borderTopColor: 'var(--accent-primary)' }} />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/home')}
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
        >
          <ArrowLeft size={18} style={{ color: 'var(--accent-primary)' }} />
        </motion.button>
      </div>

      {/* REELS label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <span className="font-display text-xs tracking-widest text-accent-primary font-semibold">REELS</span>
      </div>

      {reels.length === 0 ? (
        <div className="h-screen flex flex-col items-center justify-center bg-void">
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="font-display text-xs tracking-wider mb-2 text-accent-primary font-semibold">NO REELS YET</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload your first video reel</p>
        </div>
      ) : (
        <div ref={containerRef} className="reel-container">
          {reels.map((reel, i) => (
            <ReelItem key={reel.id} reel={reel} isActive={i === activeIndex} />
          ))}
        </div>
      )}
    </div>
  )
}
