import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import PostCard from '../components/feed/PostCard'
import Stories from '../components/stories/Stories'

const POSTS_PER_PAGE = 10

export default function Home() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const fetchPosts = useCallback(async (pageNum = 0, append = false) => {
    if (!user) return
    try {
      if (pageNum === 0) setLoading(true)
      else setLoadingMore(true)

      // Get followed users
      const { data: follows } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)
      
      const followIds = follows?.map(f => f.following_id) || []
      followIds.push(user.id)

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users(id, username, avatar),
          likes(user_id),
          comments(id, text, user_id, created_at, users(username, avatar))
        `)
        .in('user_id', followIds)
        .order('created_at', { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1)

      if (error) throw error

      const enriched = data?.map(p => ({
        ...p,
        like_count: p.likes?.length || 0,
        user_liked: p.likes?.some(l => l.user_id === user.id) || false,
      })) || []

      if (append) setPosts(prev => [...prev, ...enriched])
      else setPosts(enriched)

      setHasMore(enriched.length === POSTS_PER_PAGE)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user])

  useEffect(() => {
    fetchPosts(0)

    // Realtime subscription
    const channel = supabase.channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        () => fetchPosts(0))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchPosts])

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage, true)
  }

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [page, hasMore, loadingMore])

  return (
    <div className="relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-sm font-bold tracking-widest gradient-text">
          YOUR FEED
        </h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fetchPosts(0)}
          style={{ color: 'rgba(224,224,255,0.4)' }}
        >
          <RefreshCw size={16} />
        </motion.button>
      </div>

      {/* Stories */}
      <div className="glass rounded-2xl p-4 mb-4">
        <Stories />
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="post-card p-4 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-32 rounded" />
                  <div className="skeleton h-2 w-20 rounded" />
                </div>
              </div>
              <div className="skeleton h-48 rounded-xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-12 text-center"
        >
          <div className="text-4xl mb-4">🌌</div>
          <h3 className="font-display text-xs tracking-wider mb-2" style={{ color: 'var(--neon-cyan)' }}>
            THE VOID AWAITS
          </h3>
          <p className="text-sm" style={{ color: 'rgba(224,224,255,0.4)' }}>
            Follow some creators to fill your feed
          </p>
        </motion.div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard key={post.id} post={post} onUpdate={() => fetchPosts(0)} />
          ))}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: 'rgba(0,245,255,0.3)', borderTopColor: 'var(--neon-cyan)' }}
              />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center py-6 text-xs" style={{ color: 'rgba(224,224,255,0.2)', fontFamily: 'JetBrains Mono' }}>
              — END OF FEED —
            </p>
          )}
        </>
      )}
    </div>
  )
}
