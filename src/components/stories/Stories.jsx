import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useAuthStore } from '../../context/authStore'

export default function Stories() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('stories')
        .select('*, users(id, username, avatar)')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(20)
      
      // Group by user
      const grouped = {}
      data?.forEach(s => {
        if (!grouped[s.user_id]) grouped[s.user_id] = { ...s.users, stories: [] }
        grouped[s.user_id].stories.push(s)
      })
      setStories(Object.values(grouped))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="skeleton w-16 h-16 rounded-full" />
          <div className="skeleton w-12 h-2 rounded" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
      {/* My story / Add story */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
        onClick={() => navigate('/create?type=story')}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden"
            style={{ background: 'rgba(108,99,255,0.05)', border: '2px dashed rgba(108,99,255,0.3)' }}>
            <img
              src={user?.avatar}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center btn-gradient">
            <Plus size={12} className="text-white" strokeWidth={3} />
          </div>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
          Your Story
        </span>
      </motion.div>

      {/* Other stories */}
      {stories.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer"
          onClick={() => navigate(`/story/${s.id}`)}
        >
          <div className="story-ring p-0.5 rounded-full">
            <div className="bg-void p-0.5 rounded-full">
              <img
                src={s.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${s.username}`}
                className="w-14 h-14 rounded-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
            {s.username?.slice(0, 8)}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
