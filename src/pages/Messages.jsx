import { formatDistanceToNow } from 'date-fns'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Image, ArrowLeft, Search, Smile, Play } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'

const SharedReel = ({ reelId }) => {
  const navigate = useNavigate()
  const [reel, setReel] = useState(null)

  useEffect(() => {
    supabase.from('posts').select('*, users(username)').eq('id', reelId).single().then(({ data }) => setReel(data))
  }, [reelId])

  if (!reel) return <div className="p-3 bg-panel rounded-xl animate-pulse h-24 mb-2" />

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); navigate(`/reels/${reelId}`); }}
      className="mb-2 p-2 bg-panel rounded-2xl border border-white/10 cursor-pointer hover:border-accent-primary/50 transition-all group"
    >
      <div className="relative aspect-[9/16] h-32 rounded-xl overflow-hidden mb-2">
        {reel.media_url ? (
          <video src={reel.media_url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-void flex items-center justify-center p-2 text-[8px] text-center font-bold">
            {reel.caption}
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all flex items-center justify-center">
          <Play size={20} className="text-white drop-shadow-lg" />
        </div>
      </div>
      <p className="text-[10px] font-bold text-accent-primary truncate">@{reel.users?.username}</p>
    </div>
  )
}

export default function Messages() {
  const { userId } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const typingTimeout = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (userId) {
      const cleanup = loadConversation(userId)
      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }
      }
    }
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:sender_id(id, username, avatar), receiver:receiver_id(id, username, avatar)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const convMap = {}
      data?.forEach(msg => {
        const other = msg.sender_id === user.id ? msg.receiver : msg.sender
        if (!convMap[other.id]) convMap[other.id] = { ...other, lastMsg: msg }
      })
      setConversations(Object.values(convMap))
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadConversation = async (otherUserId) => {
    if (!user?.id) return
    try {
      const { data: userInfo } = await supabase.from('users').select('*').eq('id', otherUserId).single()
      setActiveUser(userInfo)

      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      setMessages(data || [])

      // Cleanup previous subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      // Subscribe to new messages
      channelRef.current = supabase.channel(`chat-${otherUserId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (
              (payload.new.sender_id === otherUserId && payload.new.receiver_id === user.id) ||
              (payload.new.sender_id === user.id && payload.new.receiver_id === otherUserId)
            ) {
              setMessages(msgs => [...msgs, payload.new])
            }
          }
        ).subscribe()
    } catch (e) {
      console.error('Failed to load conversation:', e)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!user?.id || !text.trim() || !activeUser) return
    const msg = text.trim()
    setText('')
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeUser.id,
      message: msg,
      created_at: new Date().toISOString()
    })
    fetchConversations()
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => setTyping(false), 2000)
  }

  if (!userId) {
    // Conversation list
    return (
      <div className="relative z-10">
        <h1 className="font-display text-sm font-bold tracking-widest text-gradient mb-5">MESSAGES</h1>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-primary opacity-60" />
          <input className="cyber-input w-full pl-9 pr-4 py-2.5 text-sm" placeholder="Search conversations..." />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-glass rounded-xl p-4 flex gap-3">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-28 rounded" />
                  <div className="skeleton h-2 w-40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="card-glass rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-display text-xs tracking-wider mb-2 text-accent-primary font-semibold">NO MESSAGES YET</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Start a conversation from someone's profile</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="card-glass rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <div className="avatar-ring flex-shrink-0">
                  <img src={conv.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${conv.username}`}
                    className="w-11 h-11 rounded-full object-cover bg-panel" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{conv.username}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {conv.lastMsg?.message?.slice(0, 40) || 'No messages yet'}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0 font-mono" style={{ color: 'var(--text-faint)' }}>
                  {conv.lastMsg && formatDistanceToNow(new Date(conv.lastMsg.created_at), { addSuffix: false })}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card-glass rounded-2xl m-4">
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Session active but profile not loaded. Please try refreshing.
        </p>
        <button onClick={() => window.location.reload()} className="btn-gradient px-6 py-2 rounded-xl text-xs font-bold">
          REFRESH
        </button>
      </div>
    )
  }

  // Chat view
  return (
    <div className="fixed inset-0 bg-void bg-grid flex flex-col z-40">
      {/* Header */}
      <div className="glass-strong flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <button onClick={() => navigate('/messages')} style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        {activeUser && (
          <>
            <div className="avatar-ring">
              <img src={activeUser.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${activeUser.username}`}
                className="w-9 h-9 rounded-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{activeUser.username}</p>
              {typing && (
                <motion.p animate={{ opacity: [0.4,1,0.4] }} transition={{ repeat: Infinity, duration: 1 }}
                  className="text-xs" style={{ color: 'var(--accent-success)' }}>typing...</motion.p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id
            const isShare = msg.message?.startsWith('share:')
            const [_, type, id] = isShare ? msg.message.split(':') : []

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, x: isMine ? 20 : -20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-4 py-2.5 ${isMine ? 'msg-sent' : 'msg-received'}`}>
                  {isShare && type === 'reel' && <SharedReel reelId={id} />}
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {isShare ? `Shared a ${type}` : msg.message}
                  </p>
                  <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="glass-strong flex items-center gap-3 p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <button type="button" style={{ color: 'var(--accent-primary)', opacity: 0.6 }}>
          <Smile size={20} />
        </button>
        <input
          value={text}
          onChange={handleTyping}
          className="cyber-input flex-1 px-4 py-2.5 text-sm"
          placeholder="Send a message..."
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="submit"
          className="w-10 h-10 rounded-xl flex items-center justify-center btn-gradient"
        >
          <Send size={16} className="text-white" />
        </motion.button>
      </form>
    </div>
  )
}
