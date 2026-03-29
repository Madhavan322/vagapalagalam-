import { formatDistanceToNow } from 'date-fns'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Play, Volume2, VolumeX, ArrowLeft, Search, Smile, Send, Trash2 } from 'lucide-react'
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import { useSEO } from '../hooks/useSEO'
import ShareModal from '../components/ui/ShareModal'

const SharedContent = ({ contentId }) => {
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('posts').select('*, users(username, avatar)').eq('id', contentId).single()
      .then(({ data }) => {
        setItem(data)
        setLoading(false)
      })
  }, [contentId])

  if (loading) return (
    <div className="p-3 bg-panel rounded-2xl animate-pulse h-32 mb-2 border border-white/5">
      <div className="w-full h-full bg-white/5 rounded-xl" />
    </div>
  )
  if (!item) return null

  const isVideo = item.type === 'video' || item.media_url?.match(/\.(mp4|webm|ogg|mov)$/i)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={(e) => { e.stopPropagation(); navigate(isVideo ? `/reels/${contentId}` : `/home?post=${contentId}`); }}
      className="mb-2 p-1.5 bg-void rounded-2xl border border-accent-primary/20 cursor-pointer overflow-hidden group shadow-2xl relative"
    >
      <div className="relative aspect-[4/5] h-48 rounded-xl overflow-hidden bg-black">
        {isVideo ? (
          <video src={item.media_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <img src={item.media_url} className="w-full h-full object-cover" alt="Shared post" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
          {isVideo && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center glass shadow-neon-primary">
              <Play size={16} className="text-white ml-1" />
            </div>
          )}
        </div>
      </div>
      <div className="p-2 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full overflow-hidden border border-accent-primary/30">
          <img src={item.users?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${item.users?.username}`} className="w-full h-full object-cover" loading="lazy" />
        </div>
        <p className="text-[10px] font-bold text-accent-primary truncate">@{item.users?.username}</p>
      </div>
    </motion.div>
  )
}

export default function Messages() {
  const { userId } = useParams()
  const { user, session, initialized } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  useSEO('Messages', 'Secure real-time chat with your community.')
  
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeUser, setActiveUser] = useState(location.state?.otherUser || null)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  
  const bottomRef = useRef(null)
  const typingTimeout = useRef(null)
  const channelRef = useRef(null)

  const emojis = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂', '💯', '✨', '🙏', '💬']

  useEffect(() => {
    if (session?.user?.id) fetchConversations()
  }, [session?.user?.id])

  useEffect(() => {
    if (userId && session?.user?.id) {
      loadConversation(userId)
    } else if (!userId) {
      setActiveUser(null)
      setMessages([])
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (e) {
          console.warn('Channel cleanup error:', e)
        }
        channelRef.current = null
      }
    }
  }, [userId, session?.user?.id])

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // RENDERING LOGIC - ALWAYS BELOW HOOKS
  if (!session && initialized) {
    return <Navigate to="/auth" replace />
  }

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-10rem)]">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-accent-primary/20 border-t-accent-primary mb-4" 
        />
      </div>
    )
  }

  async function fetchConversations() {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(id, username, avatar), receiver:receiver_id(id, username, avatar)')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const convMap = {}
      data?.forEach(msg => {
        const other = msg.sender_id === currentUserId ? msg.receiver : msg.sender
        // Fallback profile if join failed or returned null
        const profile = other || { 
          id: msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id,
          username: 'Unknown User',
          avatar: null
        }
        if (!convMap[profile.id]) convMap[profile.id] = { ...profile, lastMsg: msg }
      })
      
      const convList = Object.values(convMap)
      setConversations(convList)
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadConversation(otherUserId) {
    const currentUserId = session?.user?.id;
    if (!currentUserId || !otherUserId) return;
    
    // Prevent reloading the same conversation if it's already active
    if (activeUser?.id === otherUserId && messages.length > 0) return;

    try {
      const { data: userInfo, error: userError } = await supabase.from('users').select('*').eq('id', otherUserId).single()
      if (userError) throw userError
      setActiveUser(userInfo)

      const { data: initialMessages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
      
      if (msgError) throw msgError
      setMessages(initialMessages || [])

      // Cleanup previous subscription precisely
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      // Subscribe to all message changes for the user
      const channel = supabase.channel(`chat-main-${currentUserId}`)
      channel
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        },
        (payload) => {
          const { sender_id, receiver_id } = payload.new;
          const isRelated = sender_id === currentUserId || receiver_id === currentUserId;
          if (!isRelated) return;

          // If the message is part of the ACTIVE conversation, update messages state
          const isCurrentChat = (sender_id === otherUserId && receiver_id === currentUserId) || 
                               (sender_id === currentUserId && receiver_id === otherUserId);
          
          if (isCurrentChat) {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              const newMsgs = [...prev, payload.new];
              // Trigger scroll to bottom
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              return newMsgs;
            });
          }
          
          // Always refresh conversation sidebar for any related message
          fetchConversations();
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          fetchConversations();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channelRef.current = channel;
          }
        });


    } catch (e) {
      console.error('Failed to load conversation:', e)
    }
  }

  const updateConversationList = (newMsg, otherUser) => {
    setConversations(prev => {
      const existing = prev.find(c => c.id === otherUser.id);
      if (existing) {
        const updated = { ...existing, lastMsg: newMsg };
        // Move to top
        return [updated, ...prev.filter(c => c.id !== otherUser.id)];
      } else {
        return [{ ...otherUser, lastMsg: newMsg }, ...prev];
      }
    });
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    const currentUserId = session?.user?.id;
    if (!currentUserId || !text.trim() || !activeUser) return
    const msgContent = text.trim()
    setText('')

    const tempId = Date.now().toString()
    const optimisticMsg = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: activeUser.id,
      message: msgContent,
      created_at: new Date().toISOString(),
      optimistic: true
    }

    // Add locally for instant feedback
    setMessages(prev => [...prev, optimisticMsg])
    updateConversationList(optimisticMsg, activeUser)

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: activeUser.id,
        message: msgContent,
      }).select().single()

      if (error) throw error
      
      // Replace optimistic message with real one, ensuring data has the message
      if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...data, message: data.message || msgContent } : m))
        updateConversationList({ ...data, message: data.message || msgContent }, activeUser)
      }
    } catch (err) {
      console.error('Failed to send:', err)
      // Remove optimistic msg on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Unsend this message?')) return
    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId)
      if (error) throw error
      setMessages(prev => prev.filter(m => m.id !== messageId))
      fetchConversations() // update last message
    } catch (e) {
      console.error('Unsend failed:', e)
    }
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => setTyping(false), 2000)
  }

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji)
    setShowEmoji(false)
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
                    className="w-11 h-11 rounded-full object-cover bg-panel"
                    loading="lazy"
                  />
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

  // Chat view
  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col h-[calc(100vh-2rem)] bg-void bg-grid relative z-40"
    >
      {/* Header */}
      <div className="glass-strong flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <button onClick={() => navigate('/messages')} style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        {activeUser && (
          <>
            <div className="avatar-ring" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
              <img src={activeUser.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${activeUser.username}`}
                className="w-9 h-9 rounded-full object-cover"
                loading="lazy"
              />
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
            const isMine = msg.sender_id === session?.user?.id
            const isShare = msg.message?.startsWith('share:')
            const [_, type, id] = isShare ? msg.message.split(':') : []

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.9, y: 10, x: isMine ? 20 : -20 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] px-4 py-3 shadow-2xl backdrop-blur-xl rounded-2xl border group relative ${isMine ? 'msg-sent border-accent-primary/30' : 'msg-received border-white/10'}`}>
                  {isShare && (type === 'reel' || type === 'post') && <SharedContent contentId={id} />}
                  <div className="flex justify-between items-start gap-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1" style={{ color: 'var(--text-primary)' }}>
                      {isShare ? `Shared a ${type}` : msg.message}
                    </p>
                    {isMine && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 -mr-2"
                      >
                        <Trash2 size={12} className="text-faint hover:text-red-500" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] mt-1.5 font-mono opacity-50" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-20 left-4 z-50 glass-strong p-3 rounded-2xl grid grid-cols-6 gap-2 border border-accent-primary/20 shadow-neon-primary"
          >
            {emojis.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => addEmoji(e)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-lg"
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={sendMessage} className="glass-strong flex items-center gap-3 p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <button 
          type="button" 
          onClick={(e) => { e.preventDefault(); setShowEmoji(!showEmoji); }}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          style={{ color: 'var(--accent-primary)', opacity: showEmoji ? 1 : 0.6 }}
        >
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
    </motion.div>
  )
}
