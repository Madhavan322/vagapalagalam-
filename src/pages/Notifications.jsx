import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, UserPlus, Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import { formatDistanceToNow } from 'date-fns'

const TYPE_CONFIG = {
  like:    { icon: Heart,          color: 'var(--accent-secondary)',  bg: 'rgba(255,107,157,0.1)'  },
  comment: { icon: MessageCircle,  color: 'var(--accent-primary)',   bg: 'rgba(108,99,255,0.1)'   },
  follow:  { icon: UserPlus,       color: 'var(--accent-tertiary)',  bg: 'rgba(0,210,255,0.1)'    },
  message: { icon: MessageCircle,  color: 'var(--accent-success)',   bg: 'rgba(16,185,129,0.1)'   },
}

const SEED_NOTIFS = [
  { id: 1, type: 'like',    username: 'cyberghost_42',   text: 'liked your post',              time: new Date(Date.now() - 2 * 60000).toISOString(),        read: false },
  { id: 2, type: 'follow',  username: 'neonwave_x',      text: 'started following you',        time: new Date(Date.now() - 5 * 60000).toISOString(),        read: false },
  { id: 3, type: 'comment', username: 'void_runner',     text: 'commented: "Incredible! 🔥"',  time: new Date(Date.now() - 10 * 60000).toISOString(),       read: true  },
  { id: 4, type: 'like',    username: 'pixel_empress',   text: 'liked your reel',              time: new Date(Date.now() - 60 * 60000).toISOString(),       read: true  },
  { id: 5, type: 'follow',  username: 'astral_coder',    text: 'started following you',        time: new Date(Date.now() - 2 * 3600000).toISOString(),      read: true  },
  { id: 6, type: 'comment', username: 'matrix_dreamer',  text: 'commented: "Where is this?"', time: new Date(Date.now() - 24 * 3600000).toISOString(),     read: true  },
  { id: 7, type: 'message', username: 'orbit_seven',     text: 'sent you a message',           time: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), read: true  },
]

export default function Notifications() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => { fetchNotifs() }, [])

  const fetchNotifs = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: follows } = await supabase
        .from('followers')
        .select('created_at, follower:follower_id(id, username, avatar)')
        .eq('following_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const realNotifs = (follows || []).map(f => ({
        id:       `follow-${f.follower.id}`,
        type:     'follow',
        username: f.follower.username,
        avatar:   f.follower.avatar,
        userId:   f.follower.id,
        text:     'started following you',
        time:     f.created_at,
        read:     false,
      }))

      setNotifs([...realNotifs, ...SEED_NOTIFS])
    } catch {
      setNotifs(SEED_NOTIFS)
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = () =>
    setNotifs(n => n.map(x => ({ ...x, read: true })))

  const filtered = filter === 'all'
    ? notifs
    : notifs.filter(n => n.type === filter)

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className="relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-sm font-bold tracking-widest text-gradient">NOTIFICATIONS</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
              style={{ background: 'rgba(255,107,157,0.15)', color: 'var(--accent-secondary)', border: '1px solid rgba(255,107,157,0.3)' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs btn-ghost px-3 py-1.5">
            <Check size={12} /> Mark all read
          </motion.button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 hide-scrollbar">
        {['all', 'like', 'comment', 'follow', 'message'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-display tracking-wider transition-all font-semibold"
            style={{
              background: filter === f ? 'rgba(108,99,255,0.12)' : 'var(--bg-surface)',
              border:     filter === f ? '1px solid rgba(108,99,255,0.35)' : '1px solid var(--border-subtle)',
              color:      filter === f ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card-glass rounded-xl p-4 flex gap-3">
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-48 rounded" />
                <div className="skeleton h-2 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card-glass rounded-2xl p-12 text-center">
          <Bell size={36} className="mx-auto mb-4" style={{ color: 'var(--text-faint)' }} />
          <h3 className="font-display text-xs tracking-wider mb-2 text-accent-primary font-semibold">
            ALL CLEAR
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications here</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((n, i) => {
              const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.like
              const Icon = cfg.icon
              return (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}
                  onClick={() => n.userId && navigate(`/profile/${n.userId}`)}
                  className="flex items-center gap-3 p-4 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: n.read ? 'var(--bg-surface)' : 'var(--bg-card)',
                    border: n.read ? '1px solid var(--border-subtle)' : '1px solid var(--border-default)',
                  }}>
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={n.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${n.username}&backgroundColor=0B0B0F`}
                      className="w-10 h-10 rounded-full object-cover bg-panel"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }}>
                      <Icon size={10} style={{ color: cfg.color }} />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-semibold" style={{ color: cfg.color }}>{n.username} </span>
                      {n.text}
                    </p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-faint)' }}>
                      {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && <div className="notif-dot flex-shrink-0" />}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
