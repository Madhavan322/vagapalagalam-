import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Hash, TrendingUp, UserPlus, Check, Users } from 'lucide-react'
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
    try {
      const { data } = await supabase
        .from('posts')
        .select('id, media_url, type, caption, likes(user_id)')
        .order('created_at', { ascending: false })
        .limit(30)
      setPosts(data || [])
    } catch (e) {
      console.error('Failed to fetch explore content:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    if (!user) return
    try {
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
    } catch (e) {
      console.error('Failed to fetch suggestions:', e)
    }
  }

  const searchAll = async () => {
    setLoading(true)
    try {
      const [postsRes, usersRes] = await Promise.all([
        supabase.from('posts').select('id, media_url, type, caption').ilike('caption', `%${query}%`).limit(20),
        supabase.from('users').select('*').ilike('username', `%${query}%`).limit(10)
      ])
      setPosts(postsRes.data || [])
      setUsers(usersRes.data || [])
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (targetId) => {
    setFollowing(f => ({ ...f, [targetId]: true }))
    await supabase.from('followers').insert({ follower_id: user.id, following_id: targetId })
  }

  const trendingTags = ['#vangapalagalam', '#cyberpunk', '#art', '#music', '#travel', '#code', '#nature', '#fashion']

  return (
    <div className="relative z-10">
      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-primary opacity-60" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="cyber-input w-full pl-10 pr-4 py-3 text-sm"
          placeholder="Search users, posts, hashtags..."
        />
      </div>

      {/* Suggested creators */}
      {!query && suggestions.length > 0 && (
        <div className="card-glass rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-accent-primary" />
            <h3 className="font-display text-xs tracking-wider font-semibold text-accent-primary">
              SUGGESTED CREATORS
            </h3>
          </div>
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.username}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.bio?.slice(0, 30) || 'No bio yet'}</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleFollow(u.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all"
                  style={{
                    background: following[u.id] ? 'rgba(16,185,129,0.1)' : 'rgba(108,99,255,0.1)',
                    border: `1px solid ${following[u.id] ? 'rgba(16,185,129,0.3)' : 'rgba(108,99,255,0.3)'}`,
                    color: following[u.id] ? 'var(--accent-success)' : 'var(--accent-primary)',
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
        <div className="card-glass rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-accent-secondary" />
            <h3 className="font-display text-xs tracking-wider font-semibold text-accent-secondary">
              TRENDING
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map(tag => (
              <motion.button
                key={tag}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuery(tag.slice(1))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
                style={{
                  background: 'rgba(255,107,157,0.06)',
                  border: '1px solid rgba(255,107,157,0.15)',
                  color: 'var(--text-secondary)'
                }}
              >
                <Hash size={10} style={{ color: 'var(--accent-secondary)' }} />
                {tag.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* User results from search */}
      {query && users.length > 0 && (
        <div className="card-glass rounded-2xl p-5 mb-5">
          <h3 className="font-display text-xs tracking-wider mb-3 text-accent-primary font-semibold">USERS</h3>
          <div className="space-y-3">
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => navigate(`/profile/${u.id}`)}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover avatar-ring" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.username}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts grid */}
      <div>
        <h3 className="font-display text-xs tracking-wider mb-3 font-semibold" style={{ color: 'var(--text-muted)' }}>
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
                style={{ background: 'var(--bg-card)' }}
              >
                {p.media_url ? (
                  p.type === 'video' ? (
                    <video src={p.media_url} preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={p.media_url} className="w-full h-full object-cover" loading="lazy" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3"
                    style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-card))' }}>
                    <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                      {p.caption?.slice(0, 60)}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
