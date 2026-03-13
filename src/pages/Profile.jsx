import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, Play, Settings, UserPlus, UserMinus, MessageSquare, Edit3, Camera } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, uploadMedia } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

export default function Profile() {
  const { userId } = useParams()
  const { user, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const targetId = userId || user?.id

  const [profile,    setProfile]    = useState(null)
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
    setLoading(true)
    try {
      // Profile
      const { data: prof } = await supabase.from('users').select('*').eq('id', targetId).single()
      setProfile(prof)
      setEditForm({ username: prof?.username || '', bio: prof?.bio || '' })

      // Posts
      const { data: postsData } = await supabase
        .from('posts').select('id, media_url, type, caption')
        .eq('user_id', targetId).eq('type', 'image').order('created_at', { ascending: false })
      setPosts(postsData || [])

      // Reels
      const { data: reelsData } = await supabase
        .from('posts').select('id, media_url, type, caption')
        .eq('user_id', targetId).eq('type', 'video').order('created_at', { ascending: false })
      setReels(reelsData || [])

      // Counts
      const [{ count: postsCount }, { count: followersCount }, { count: followingCount }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', targetId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
      ])
      setCounts({ posts: postsCount || 0, followers: followersCount || 0, following: followingCount || 0 })

      // Am I following?
      if (!isOwn && user) {
        const { data: f } = await supabase.from('followers')
          .select('id').eq('follower_id', user.id).eq('following_id', targetId).maybeSingle()
        setFollowing(!!f)
      }
    } catch (e) {
      console.error(e)
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

  if (loading) return (
    <div className="relative z-10 space-y-4">
      <div className="glass rounded-2xl p-6 space-y-4">
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
    <div className="relative z-10 glass rounded-2xl p-12 text-center">
      <p style={{ color: 'rgba(224,224,255,0.4)' }}>User not found</p>
    </div>
  )

  const displayItems = tab === 'posts' ? posts : reels

  return (
    <div className="relative z-10">
      {/* Profile card */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-4 mb-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="story-ring p-0.5 rounded-full">
              <div className="bg-void p-0.5 rounded-full">
                <img
                  src={profile.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${profile.username}&backgroundColor=040408`}
                  className="w-20 h-20 rounded-full object-cover bg-panel"
                />
              </div>
            </div>
            {isOwn && (
              <label className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))' }}>
                <Camera size={12} className="text-void" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgba(0,245,255,0.3)', borderTopColor: 'var(--neon-cyan)' }} />
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
                  <button onClick={handleSaveProfile} className="btn-primary px-3 py-1.5 text-xs">SAVE</button>
                  <button onClick={() => setEditing(false)} className="btn-ghost px-3 py-1.5 text-xs">CANCEL</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-semibold text-base" style={{ color: '#e0e0ff' }}>{profile.username}</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(224,224,255,0.5)', lineHeight: 1.5 }}>
                  {profile.bio || 'No bio yet.'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(224,224,255,0.25)', fontFamily: 'JetBrains Mono' }}>
                  {profile.email}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-0 mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,245,255,0.1)' }}>
          {[
            { label: 'POSTS',     value: counts.posts },
            { label: 'FOLLOWERS', value: counts.followers },
            { label: 'FOLLOWING', value: counts.following },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex-1 py-3 text-center"
              style={{ borderRight: i < 2 ? '1px solid rgba(0,245,255,0.1)' : 'none' }}>
              <p className="font-display font-bold text-lg gradient-text">{value}</p>
              <p className="text-xs tracking-wider" style={{ color: 'rgba(224,224,255,0.4)', fontFamily: 'JetBrains Mono', fontSize: '0.6rem' }}>{label}</p>
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
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleFollow}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-display tracking-wider"
              style={{
                background: following ? 'rgba(255,0,110,0.1)' : 'linear-gradient(135deg,var(--neon-cyan),var(--neon-purple))',
                border: following ? '1px solid rgba(255,0,110,0.3)' : 'none',
                color: following ? 'var(--neon-pink)' : 'var(--void)',
                fontWeight: 700,
              }}>
              {following ? <><UserMinus size={14} /> UNFOLLOW</> : <><UserPlus size={14} /> FOLLOW</>}
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(`/messages/${targetId}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-display tracking-wider btn-ghost">
              <MessageSquare size={14} /> MESSAGE
            </motion.button>
          </div>
        )}
      </div>

      {/* Content tabs */}
      <div className="flex mb-3 rounded-xl overflow-hidden glass" style={{ border: '1px solid rgba(0,245,255,0.1)' }}>
        {[{ id: 'posts', icon: Grid, label: 'POSTS' }, { id: 'reels', icon: Play, label: 'REELS' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-display tracking-wider transition-all"
            style={{
              background: tab === t.id ? 'rgba(0,245,255,0.08)' : 'transparent',
              color: tab === t.id ? 'var(--neon-cyan)' : 'rgba(224,224,255,0.4)',
              borderBottom: tab === t.id ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {displayItems.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-sm" style={{ color: 'rgba(224,224,255,0.3)' }}>No {tab} yet</p>
        </div>
      ) : (
        <div className="explore-grid gap-0.5">
          {displayItems.map((item, i) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="relative aspect-square overflow-hidden group cursor-pointer"
              style={{ background: 'var(--panel)' }}>
              {item.media_url ? (
                item.type === 'video'
                  ? <video src={item.media_url} className="w-full h-full object-cover" />
                  : <img src={item.media_url} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-surface to-panel">
                  <p className="text-xs text-center" style={{ color: 'rgba(224,224,255,0.5)' }}>
                    {item.caption?.slice(0, 50)}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity
                flex items-center justify-center">
                {item.type === 'video' ? <Play size={24} style={{ color: 'var(--neon-cyan)' }} />
                  : <Grid size={20} style={{ color: 'var(--neon-cyan)' }} />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
