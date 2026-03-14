import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useAuthStore } from '../../context/authStore'
import toast from 'react-hot-toast'

export default function FollowButton({ targetId, initialFollowing = false, onToggle, className = '' }) {
  const { user } = useAuthStore()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && targetId && user.id !== targetId) {
      checkFollowStatus()
    }
  }, [user, targetId])

  const checkFollowStatus = async () => {
    try {
      const { data } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
        .maybeSingle()
      setFollowing(!!data)
    } catch (e) {
      console.error('Error checking follow status:', e)
    }
  }

  const handleFollow = async (e) => {
    e.stopPropagation()
    if (!user) return toast.error('Please sign in to follow users')
    if (user.id === targetId) return
    
    setLoading(true)
    const prevStatus = following
    setFollowing(!prevStatus) // Optimistic update

    try {
      if (prevStatus) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .match({ follower_id: user.id, following_id: targetId })
        if (error) throw error
        toast.success('Unfollowed')
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: targetId })
        if (error) throw error
        toast.success('Following')
      }
      if (onToggle) onToggle(!prevStatus)
    } catch (err) {
      setFollowing(prevStatus) // Rollback
      toast.error('Action failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.id === targetId) return null

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleFollow}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-display tracking-wider font-bold transition-all ${className}`}
      style={{
        background: following ? 'rgba(255,107,157,0.1)' : 'linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))',
        border: following ? '1px solid rgba(255,107,157,0.3)' : 'none',
        color: following ? 'var(--accent-secondary)' : 'white',
        minWidth: '100px'
      }}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : following ? (
        <><UserMinus size={14} /> UNFOLLOW</>
      ) : (
        <><UserPlus size={14} /> FOLLOW</>
      )}
    </motion.button>
  )
}
