import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Hash, TrendingUp, UserPlus, Check } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import { useNavigate } from 'react-router-dom'

export default function Explore() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('trending')
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState({})

  useEffect(() => {
    fetchContent()
    fetchSuggestions()
  }, [])

  useEffect(() => {
    if (query) searchAll()
    else fetchContent()
  }, [query, tab])

  const fetchContent = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('id, media_url, type, caption, likes(count)')
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)
    setPosts(data || [])
    setLoading(false)
  }

  const fetchSuggestions = async () => {
    if (!user) return
    const { data: follows } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', user.id)
    const followIds = follows?.map(f => f.following_id) || []
    followIds.push(user.id)

    const { data } = await supabase
      .from('users')
      .select('*')
      .not('id', 'in', `(${followIds.join(',')})`)
      .limit(5)
    setSuggestions(data || [])
  }

  const searchAll = async () => {
    setLoading(true)
    const [postsRes, usersRes] = await Promise.all([
      supabase.from('posts').select('id, media_url, type, caption').ilike('caption', `%${query}%`).limit(20),
      supabase.from('users').select('*').ilike('username', `%${query}%`).limit(10)
    ])
    setPosts(postsRes.data || [])
    setUsers(usersRes.data || [])
    setLoading(false)
  }

  const handleFollow = async (targetId) => {
    setFollowing(f => ({ ...f, [targetId]: true }))
    await supabase.from('followers').insert({ follower_id: user.id, following_id: targetId })
  }

  const trendingTags = ['#vangapalagalam', '#cyberpunk', '#art', '#music', '#travel', '#code', '#nature', '#fashion']

  return (
    <div className="relative z-10">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,245,255,0.5)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="cyber-input w-full pl-9 pr-4 py-3 text-sm"
          placeholder="Search users, posts, hashtags..."
        />
      </div>

      {/* Suggested creators */}
      {!query && suggestions.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4">
          <h3 className="font-display text-xs tracking-wider mb-3" style={{ color: 'var(--neon-cyan)' }}>
            SUGGESTED CREATORS
          </h3>
          <div className="space-y-3">
            {suggestions.map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/profile/${u.id}`)}
                >
                  <div className="avatar-ring">
                    <img src={u.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${u.username}`}
                      className="w-9 h-9 rounded-full object-cover bg-panel" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#e0e0ff' }}>{u.username}</p>
                    <p className="text-xs" style={{ color: 'rgba(224,224,255,0.4)' }}>{u.bio?.slice(0, 30) || 'No bio yet'}</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleFollow(u.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all"
                  style={{
                    background: following[u.id] ? 'rgba(0,255,136,0.1)' : 'rgba(0,245,255,0.1)',
                    border: `1px solid ${following[u.id] ? 'rgba(0,255,136,0.3)' : 'rgba(0,245,255,0.3)'}`,
                    color: following[u.id] ? 'var(--neon-green)' : 'var(--neon-cyan)',
                  }}
                >
                  {following[u.id] ? <Check size={12} /> : <UserPlus size={12} />}
                  {following[u.id] ? 'FOLLOWING' : 'FOLLOW'}
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending hashtags */}
      {!query && (
        <div className="glass rounded-2xl p-4 mb-4">
          <h3 className="font-display text-xs tracking-wider mb-3" style={{ color: 'var(--neon-purple)' }}>
            TRENDING
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map(tag => (
              <motion.button
                key={tag}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuery(tag.slice(1))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: 'rgba(191,0,255,0.08)',
                  border: '1px solid rgba(191,0,255,0.2)',
                  color: 'rgba(224,224,255,0.7)'
                }}
              >
                <Hash size={10} style={{ color: 'var(--neon-purple)' }} />
                {tag.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* User results from search */}
      {query && users.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4">
          <h3 className="font-display text-xs tracking-wider mb-3" style={{ color: 'var(--neon-cyan)' }}>USERS</h3>
          <div className="space-y-3">
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => navigate(`/profile/${u.id}`)}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover avatar-ring" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#e0e0ff' }}>{u.username}</p>
                  <p className="text-xs" style={{ color: 'rgba(224,224,255,0.4)' }}>{u.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts grid */}
      <div>
        <h3 className="font-display text-xs tracking-wider mb-3" style={{ color: 'rgba(224,224,255,0.5)' }}>
          {query ? 'POSTS' : 'DISCOVER'}
        </h3>
        {loading ? (
          <div className="explore-grid gap-0.5">
            {[...Array(9)].map((_, i) => <div key={i} className="skeleton aspect-square" />)}
          </div>
        ) : (
          <div className="explore-grid gap-0.5">
            {posts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative aspect-square overflow-hidden cursor-pointer group"
                style={{ background: 'var(--panel)' }}
              >
                {p.media_url ? (
                  p.type === 'video' ? (
                    <video src={p.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={p.media_url} className="w-full h-full object-cover" loading="lazy" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-xs text-center" style={{ color: 'rgba(224,224,255,0.5)' }}>
                      {p.caption?.slice(0, 40)}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <TrendingUp size={20} style={{ color: 'var(--neon-cyan)' }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
