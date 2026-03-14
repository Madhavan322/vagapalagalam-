import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Play, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase, withTimeout } from '../../services/supabaseClient'
import { useAuthStore } from '../../context/authStore'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import FollowButton from '../ui/FollowButton'
import ShareModal from '../ui/ShareModal'

export default function PostCard({ post, onUpdate }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.user_liked || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [saved, setSaved] = useState(post.user_saved || false)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(post.comments || [])
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const handleLike = async () => {
    if (!user) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => c + (newLiked ? 1 : -1))

    try {
      if (newLiked) {
        await withTimeout(supabase.from('likes').insert({ user_id: user.id, post_id: post.id }), 5000)
      } else {
        await withTimeout(supabase.from('likes').delete().match({ user_id: user.id, post_id: post.id }), 5000)
      }
    } catch (e) {
      console.error('Like failed:', e)
    }
  }

  const handleSave = async () => {
    setSaved(s => !s)
    toast.success(saved ? 'Removed from saved' : 'Saved!')
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim() || !user) return
    const text = comment
    const newComment = {
      id: Date.now(),
      user_id: user.id,
      post_id: post.id,
      text: text,
      created_at: new Date().toISOString(),
      users: { username: user.username, avatar: user.avatar }
    }
    setComments(c => [...c, newComment])
    setComment('')
    try {
      await withTimeout(supabase.from('comments').insert({ user_id: user.id, post_id: post.id, text }), 5000)
    } catch (e) {
      console.error('Comment failed:', e)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    try {
      const { error } = await withTimeout(supabase.from('posts').delete().eq('id', post.id), 5000)
      if (error) throw error
      toast.success('Post deleted successfully')
      if (onUpdate) onUpdate()
    } catch (e) {
      console.error('Delete failed:', e)
      toast.error('Failed to delete post')
    }
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true })

  const isOwner = user?.id === post.user_id

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="post-card mb-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/profile/${post.users?.id}`)}
        >
          <div className="avatar-ring">
            <img
              src={post.users?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${post.users?.username}`}
              alt={post.users?.username}
              className="w-9 h-9 rounded-full object-cover bg-panel"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {post.users?.username}
              </p>
              <FollowButton targetId={post.users?.id} className="h-6 px-2 !rounded-lg !min-w-[70px] !text-[10px]" />
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {timeAgo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={handleDelete}
              style={{ color: 'var(--text-faint)' }}
              className="p-2 hover:text-accent-secondary transition-colors"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
          <button style={{ color: 'var(--text-muted)' }} className="p-2">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="px-4 pb-3 text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {post.caption}
        </p>
      )}

      {/* Media */}
      {post.media_url && (
        <div className="relative">
          {post.type === 'video' ? (
            <div className="relative cursor-pointer" onClick={() => setVideoPlaying(!videoPlaying)}>
              <video
                src={post.media_url}
                className="w-full max-h-96 object-cover"
                loop
                playsInline
                preload="metadata"
                ref={el => el && (videoPlaying ? el.play() : el.pause())}
              />
              {!videoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center glass glow-purple">
                    <Play size={24} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <img
              src={post.media_url}
              alt="Post"
              className="w-full max-h-96 object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleLike}
            className="flex items-center gap-1.5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={liked ? 'liked' : 'not'}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Heart
                  size={20}
                  fill={liked ? 'var(--accent-secondary)' : 'none'}
                  style={{
                    color: liked ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    filter: liked ? 'drop-shadow(0 0 8px var(--glow-secondary))' : 'none'
                  }}
                />
              </motion.div>
            </AnimatePresence>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {likeCount}
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowComments(s => !s)}
            className="flex items-center gap-1.5"
          >
            <MessageCircle size={20} style={{ color: showComments ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {comments.length}
            </span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }} onClick={handleShare}>
            <Share2 size={20} style={{ color: 'var(--text-muted)' }} />
          </motion.button>
        </div>

        <motion.button whileTap={{ scale: 0.8 }} onClick={handleSave}>
          <Bookmark
            size={20}
            fill={saved ? 'var(--accent-primary)' : 'none'}
            style={{
              color: saved ? 'var(--accent-primary)' : 'var(--text-muted)',
              filter: saved ? 'drop-shadow(0 0 8px var(--glow-primary))' : 'none'
            }}
          />
        </motion.button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                  No comments yet. Be the first!
                </p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <img
                    src={c.users?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${c.users?.username}`}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>
                      {c.users?.username}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment} className="flex gap-2 px-4 pb-4">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="cyber-input flex-1 px-3 py-2 text-xs"
                placeholder="Add a comment..."
              />
              <button type="submit" className="btn-gradient px-4 py-2 text-xs rounded-lg font-semibold">POST</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShare && (
          <ShareModal 
            item={post} 
            type={post.type === 'video' ? 'reel' : 'post'} 
            onClose={() => setShowShare(false)} 
          />
        )}
      </AnimatePresence>
    </motion.article>
  )
}
