import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Play, Volume2, VolumeX, ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, withTimeout } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import ShareModal from '../components/ui/ShareModal'

function ReelItem({ reel, isActive, shouldLoad }) {
  const { user } = useAuthStore()
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const [liked, setLiked] = useState(reel.user_liked || false)
  const [likeCount, setLikeCount] = useState(reel.like_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [playing, setPlaying] = useState(isActive)

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
      setPlaying(true)
    } else {
      videoRef.current.pause()
      setPlaying(false)
    }
  }, [isActive])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
      setPlaying(false)
    } else {
      videoRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }

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
    setShowShare(true)
  }

  return (
    <>
      <div className="reel-item relative flex items-center justify-center bg-void overflow-hidden" onClick={togglePlay}>
        {/* Video code same ... */}
        {reel.media_url ? (
          shouldLoad ? (
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
            <div className="w-full h-full bg-black" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-card))' }}>
            <p className="text-2xl font-display font-bold text-gradient text-center px-8">{reel.caption}</p>
          </div>
        )}

        {/* Play/Pause Overlay code same ... */}
        {!playing && reel.media_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center glass glow-purple">
              <Play size={32} style={{ color: 'var(--accent-primary)', marginLeft: '4px' }} />
            </div>
          </div>
        )}

        {/* Overlay gradient code same ... */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Top controls code same ... */}
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

        {/* Bottom info code same ... */}
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

        {/* Side actions code same ... */}
        <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center z-30" onClick={e => e.stopPropagation()}>
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

      <AnimatePresence>
        {showShare && (
          <ShareModal 
            item={reel} 
            type="reel" 
            onClose={() => setShowShare(false)} 
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default function Reels() {
  const navigate = useNavigate()
  const { reelId } = useParams()
  const { user } = useAuthStore()
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    fetchReels()
  }, [user?.id])

  const fetchReels = async () => {
    let specificReel = null
    if (reelId) {
      const { data } = await withTimeout(
        supabase
          .from('posts')
          .select(`*, users(id, username, avatar), likes(user_id), comments(id)`)
          .eq('id', reelId)
          .single(),
        10000
      ).catch(() => ({ data: null }))
      if (data) specificReel = data
    }

    const { data } = await withTimeout(
      supabase
        .from('posts')
        .select(`*, users(id, username, avatar), likes(user_id), comments(id)`)
        .eq('type', 'video')
        .order('created_at', { ascending: false })
        .limit(20),
      15000
    ).catch(() => ({ data: [] }))
    
    const fetchedReels = (data || []).map(r => ({
      ...r,
      user_liked: r.likes?.some(l => l.user_id === user?.id),
      like_count: r.likes?.length || 0
    }))

    let finalReels = fetchedReels
    if (specificReel) {
      const enrichedSpecific = {
        ...specificReel,
        user_liked: specificReel.likes?.some(l => l.user_id === user?.id),
        like_count: specificReel.likes?.length || 0
      }
      finalReels = [enrichedSpecific, ...fetchedReels.filter(r => r.id !== specificReel.id)]
    }

    setReels(finalReels)
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
            <ReelItem 
              key={reel.id} 
              reel={reel} 
              isActive={i === activeIndex} 
              shouldLoad={Math.abs(i - activeIndex) <= 2}
            />
          ))}
        </div>
      )}
    </div>
  )
}
