import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, Play, Settings, UserPlus, UserMinus, MessageSquare, Edit3, Camera, LogOut } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, uploadMedia, withTimeout, signOut as supabaseSignOut } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import { useSEO } from '../hooks/useSEO'
import FollowButton from '../components/ui/FollowButton'
import toast from 'react-hot-toast'

export default function Profile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, updateUser, logout: localLogout } = useAuthStore()
  const targetId = userId || currentUser?.id
  const isOwnProfile = !userId || userId === currentUser?.id
  
  const [profile,    setProfile]    = useState(null)
  useSEO(profile ? `@${profile.username}` : 'Profile', `View ${profile?.username || 'user'}'s profile on Vangapalagalam.`)
  const [posts,      setPosts]      = useState([])
  const [reels,      setReels]      = useState([])
  const [tab,        setTab]        = useState('posts')
  const [loading,    setLoading]    = useState(true)
  const [following,  setFollowing]  = useState(false)
  const [counts,     setCounts]     = useState({ posts: 0, followers: 0, following: 0 })
  const [editing,    setEditing]    = useState(false)
  const [editForm,   setEditForm]   = useState({ username: '', bio: '' })
  const [uploading,  setUploading]  = useState(false)

  const isOwn = targetId === user?.id

  useEffect(() => {
    if (targetId) fetchProfile()
  }, [targetId])

  const fetchProfile = async () => {
    if (!targetId) return
    setLoading(true)
    try {
      // 1. Fetch Profile with Timeout
      const { data: prof, error: profError } = await withTimeout(
        supabase.from('users').select('*').eq('id', targetId).single(),
        10000
      ).catch(err => ({ data: null, error: err }))

      if (profError || !prof) {
        if (isOwn && user) {
          setProfile(user)
          setEditForm({ username: user.username || '', bio: user.bio || '' })
        } else {
          setProfile(null)
        }
      } else {
        setProfile(prof)
        setEditForm({ username: prof.username || '', bio: prof.bio || '' })
      }

      // 2. Fetch Media & Counts in parallel (each with its own timeout)
      const fetchMedia = async () => {
        const [postsRes, reelsRes, statsRes] = await Promise.all([
          withTimeout(supabase.from('posts').select('id, media_url, type, caption').eq('user_id', targetId).eq('type', 'image').order('created_at', { ascending: false }), 8000),
          withTimeout(supabase.from('posts').select('id, media_url, type, caption').eq('user_id', targetId).eq('type', 'video').order('created_at', { ascending: false }), 8000),
          Promise.all([
            withTimeout(supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', targetId), 5000),
            withTimeout(supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', targetId), 5000),
            withTimeout(supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', targetId), 5000),
          ])
        ]).catch(() => [[], [], [{}, {}, {}]])

        setPosts(postsRes.data || [])
        setReels(reelsRes.data || [])
        setCounts({ 
          posts: statsRes[0]?.count || 0, 
          followers: statsRes[1]?.count || 0, 
          following: statsRes[2]?.count || 0 
        })
      }

      await fetchMedia()

      // 3. Follow status
      if (!isOwn && user) {
        const { data: f } = await withTimeout(
          supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', targetId).maybeSingle(),
          5000
        ).catch(() => ({ data: null }))
        setFollowing(!!f)
      }
    } catch (e) {
      console.error('Profile fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!user) return
    if (following) {
      setFollowing(false)
      setCounts(c => ({ ...c, followers: c.followers - 1 }))
      await supabase.from('followers').delete().match({ follower_id: user.id, following_id: targetId })
    } else {
      setFollowing(true)
      setCounts(c => ({ ...c, followers: c.followers + 1 }))
      await supabase.from('followers').insert({ follower_id: user.id, following_id: targetId })
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from('users')
        .update({ username: editForm.username, bio: editForm.bio })
        .eq('id', user.id)
      if (error) throw error
      updateUser({ username: editForm.username, bio: editForm.bio })
      setProfile(p => ({ ...p, ...editForm }))
      setEditing(false)
      toast.success('Profile updated!')
    } catch (e) {
      toast.error('Failed to update profile')
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadMedia(file, 'avatars')
      await supabase.from('users').update({ avatar: url }).eq('id', user.id)
      updateUser({ avatar: url })
      setProfile(p => ({ ...p, avatar: url }))
      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabaseSignOut()
      localLogout()
      toast.success('Signed out successfully')
      navigate('/')
    } catch (e) {
      toast.error('Logout failed')
    }
  }

  if (loading) return (
    <div className="relative z-10 space-y-4">
      <div className="card-glass rounded-2xl p-6 space-y-4">
        <div className="flex gap-4">
          <div className="skeleton w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-3 w-48 rounded" />
          </div>
        </div>
        <div className="flex gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 w-16 rounded" />)}
        </div>
      </div>
      <div className="explore-grid gap-0.5">
        {[...Array(9)].map((_, i) => <div key={i} className="skeleton aspect-square" />)}
      </div>
    </div>
  )

  if (!profile) return (
    <div className="relative z-10 card-glass rounded-2xl p-12 text-center">
      {loading || !targetId ? (
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2 border-accent-primary/30 border-t-accent-primary" />
          <p style={{ color: 'var(--text-muted)' }}>Synchronizing profile...</p>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>User not found</p>
      )}
    </div>
  )

  const tabs = [
    { id: 'posts', icon: Grid, label: 'POSTS' },
    { id: 'reels', icon: Play, label: 'REELS' },
  ]

  const displayItems = tab === 'posts' ? posts : reels

  return (
    <div className="relative z-10">
      {/* Profile card */}
      <div className="card-glass rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4 mb-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="story-ring p-0.5 rounded-full">
              <div className="bg-void p-0.5 rounded-full">
                <img
                  src={profile.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${profile.username}&backgroundColor=0B0B0F`}
                  className="w-20 h-20 rounded-full object-cover bg-panel"
                />
              </div>
            </div>
            {isOwn && (
              <label className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer btn-gradient">
                <Camera size={12} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2 border-accent-primary/30 border-t-accent-primary" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                  className="cyber-input w-full px-3 py-2 text-sm font-semibold" placeholder="Username" />
                <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  className="cyber-input w-full px-3 py-2 text-xs resize-none" rows={2} placeholder="Your bio..." />
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="btn-gradient px-4 py-1.5 text-xs rounded-lg font-semibold">SAVE</button>
                  <button onClick={() => setEditing(false)} className="btn-ghost px-3 py-1.5 text-xs">CANCEL</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>{profile.username}</h2>
                  {isOwn && (
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={handleLogout}
                      className="p-1.5 rounded-lg text-secondary hover:bg-white/5 transition-colors"
                      title="Logout"
                    >
                      <LogOut size={16} className="text-accent-secondary opacity-70" />
                    </motion.button>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {profile.bio || 'No bio yet.'}
                </p>
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>
                  {profile.email}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-0 mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {[
            { label: 'POSTS',     value: counts.posts },
            { label: 'FOLLOWERS', value: counts.followers },
            { label: 'FOLLOWING', value: counts.following },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex-1 py-3 text-center"
              style={{ borderRight: i < 2 ? '1px solid var(--border-default)' : 'none' }}>
              <p className="font-display font-bold text-lg text-gradient">{value}</p>
              <p className="text-xs tracking-wider font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {isOwn ? (
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-display tracking-wider btn-primary">
              <Edit3 size={14} /> EDIT PROFILE
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/create')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-display tracking-wider btn-ghost">
              <Camera size={14} /> CREATE POST
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-2">
            <FollowButton 
              targetId={targetId} 
              className="flex-1 py-2.5" 
              onToggle={(isFollowing) => setCounts(c => ({ ...c, followers: c.followers + (isFollowing ? 1 : -1) }))} 
            />
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(`/messages/${targetId}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-display tracking-wider btn-ghost">
              <MessageSquare size={14} /> MESSAGE
            </motion.button>
          </div>
        )}
      </div>

      {/* Content tabs */}
      <div className="flex mb-4 rounded-xl overflow-hidden card-glass" style={{ border: '1px solid var(--border-default)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-display tracking-wider transition-all"
            style={{
              background: tab === t.id ? 'rgba(108,99,255,0.08)' : 'transparent',
              color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {displayItems.length === 0 ? (
        <div className="card-glass rounded-2xl p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No {tab} yet</p>
        </div>
      ) : (
        <div className="explore-grid gap-0.5">
          {displayItems.map((item, i) => (
            <motion.div key={item.id}
              onClick={() => navigate(item.type === 'video' ? `/reels/${item.id}` : `/post/${item.id}`)}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="relative aspect-square overflow-hidden group cursor-pointer"
              style={{ background: 'var(--bg-card)' }}>
              {item.media_url ? (
                item.type === 'video'
                  ? <video src={item.media_url} preload="metadata" className="w-full h-full object-cover" />
                  : <img src={item.media_url} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3"
                  style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-card))' }}>
                  <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                    {item.caption?.slice(0, 60)}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity
                flex items-center justify-center">
                {item.type === 'video' ? <Play size={24} style={{ color: 'var(--accent-primary)' }} />
                  : <Grid size={20} style={{ color: 'var(--accent-primary)' }} />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
