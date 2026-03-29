import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Play, Volume2, VolumeX, ArrowLeft, Trash2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, withTimeout } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'
import ShareModal from '../components/ui/ShareModal'

function CommentPanel({ postId, onClose }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComments()
    
    // Subscribe to new comments
    const channel = supabase.channel(`comments-${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, 
        () => fetchComments())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [postId])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, users(username, avatar)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
    if (data) setComments(data)
    setLoading(false)
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!user || !text.trim()) return
    const content = text.trim()
    setText('')

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content
      })
      if (error) throw error
      fetchComments()
    } catch (err) {
      toast.error('Failed to post comment')
    }
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-x-0 bottom-0 z-50 glass-strong h-[60vh] rounded-t-3xl border-t border-white/10 flex flex-col"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-display tracking-widest font-bold text-accent-primary">COMMENTS</h3>
        <button onClick={onClose} className="p-1 text-muted hover:text-white transition-colors">
          <ArrowLeft size={18} className="rotate-270" style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-20 bg-white/5 rounded" />
                  <div className="h-3 w-full bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted">No comments yet. Be the first to speak!</p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <img src={c.users?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${c.users?.username}`} 
                className="w-8 h-8 rounded-full border border-white/10" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold text-white">@{c.users?.username}</span>
                  <span className="text-[10px] text-faint">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handlePost} className="p-4 border-t border-white/5 flex gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="cyber-input flex-1 px-4 py-2 text-sm"
        />
        <button type="submit" className="p-2 btn-gradient rounded-xl">
          <Send size={18} className="text-white" />
        </button>
      </form>
    </motion.div>
  )
}

function ReelItem({ reel, isActive, shouldLoad }) {
  const { user } = useAuthStore()
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const [liked, setLiked] = useState(reel.user_liked || false)
  const [likeCount, setLikeCount] = useState(reel.like_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [playing, setPlaying] = useState(isActive)
  const isOwner = user?.id === reel.user_id

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

  const handleLike = async (e) => {
    e.stopPropagation()
    if (!user) return toast.error('Sign in to like')
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => c + (newLiked ? 1 : -1))
    try {
      if (newLiked) {
        await supabase.from('likes').insert({ user_id: user.id, post_id: reel.id })
      } else {
        await supabase.from('likes').delete().match({ user_id: user.id, post_id: reel.id })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this reel forever?')) return
    try {
      const { error } = await withTimeout(supabase.from('posts').delete().eq('id', reel.id), 5000)
      if (error) throw error
      toast.success('Reel deleted')
      window.location.reload() // Simplest way to refresh the feed
    } catch (err) {
      toast.error('Failed to delete reel')
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

        <div className="absolute top-4 right-4 flex items-center gap-3">
          {isOwner && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              className="w-9 h-9 rounded-full flex items-center justify-center glass border-red-500/30"
            >
              <Trash2 size={16} className="text-red-500" />
            </motion.button>
          )}
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
              loading="lazy"
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
        {showComments && (
          <CommentPanel 
            postId={reel.id} 
            onClose={() => setShowComments(false)} 
          />
        )}
      </AnimatePresence>

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    fetchReels(0)
  }, [user?.id])

  const fetchReels = async (pageNum = 0, append = false) => {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)
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
        .range(pageNum * 10, (pageNum + 1) * 10 - 1),
      15000
    ).catch(() => ({ data: [] }))
    
    const fetchedReels = (data || []).map(r => ({
      ...r,
      user_liked: r.likes?.some(l => l.user_id === user?.id),
      like_count: r.likes?.length || 0
    }))

    if (fetchedReels.length < 10) setHasMore(false)

    let finalReels = fetchedReels
    if (specificReel) {
      const enrichedSpecific = {
        ...specificReel,
        user_liked: specificReel.likes?.some(l => l.user_id === user?.id),
        like_count: specificReel.likes?.length || 0
      }
      finalReels = [enrichedSpecific, ...fetchedReels.filter(r => r.id !== specificReel.id)]
    }

    if (append) setReels(prev => [...prev, ...finalReels])
    else setReels(finalReels)
    
    setLoading(false)
    setLoadingMore(false)
  }

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchReels(nextPage, true)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observerOptions = {
      root: container,
      threshold: 0.6, // Reel must be 60% visible to be considered active
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index'))
          if (!isNaN(index)) {
            setActiveIndex(index)
          }
        }
      })
    }, observerOptions)

    const reelItems = container.querySelectorAll('.reel-item')
    reelItems.forEach((item) => observer.observe(item))

    // Infinite scroll check based on scrolling position
    const handleScroll = () => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 600) {
        loadMore()
      }
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      observer.disconnect()
      container.removeEventListener('scroll', handleScroll)
    }
  }, [reels]) // Re-run when reels update to observe new items

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
            <div key={reel.id} className="reel-item" data-index={i}>
              <ReelItem 
                reel={reel} 
                isActive={i === activeIndex} 
                shouldLoad={Math.abs(i - activeIndex) <= 2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
