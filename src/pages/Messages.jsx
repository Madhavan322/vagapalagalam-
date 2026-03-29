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
  const currentUserId = session?.user?.id
  const navigate = useNavigate()
  const location = useLocation()
  useSEO('Messages', 'Secure real-time chat with your community.')
  
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeUser, setActiveUser] = useState(location.state?.otherUser || null)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
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
    
    // Optimistic header update from existing conversation list
    const existingConv = conversations.find(c => c.id === otherUserId);
    if (existingConv) {
      setActiveUser(existingConv);
    }

    setLoadingChat(true);
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
    } finally {
      setLoadingChat(false);
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

  const renderSidebar = () => (
    <div className={`flex flex-col h-full bg-surface ${userId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 border-r border-subtle relative z-10`} style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h1 className="font-display text-sm font-bold tracking-widest text-gradient mb-4">MESSAGES</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-primary opacity-50" />
          <input className="cyber-input w-full pl-9 pr-4 py-2 text-xs" placeholder="Search people..." style={{ backgroundColor: 'var(--bg-void)', borderColor: 'var(--border-default)' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-3 rounded-xl animate-pulse flex gap-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-20 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
                <div className="h-2 w-32 roundedOpacity-50" style={{ backgroundColor: 'var(--bg-hover)' }} />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono py-20" style={{ color: 'var(--text-muted)' }}>NO CONVERSATIONS</div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${userId === conv.id ? 'active-conv' : 'hover:bg-hover'}`}
              style={{ 
                backgroundColor: userId === conv.id ? 'var(--bg-hover)' : 'transparent',
                borderRight: userId === conv.id ? '2px solid var(--accent-primary)' : 'none'
              }}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-subtle)' }}>
                <img src={conv.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${conv.username}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: userId === conv.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{conv.username}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {conv.lastMsg?.message || 'No messages'}
                </p>
              </div>
              {conv.lastMsg && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                  {formatDistanceToNow(new Date(conv.lastMsg.created_at), { addSuffix: false })}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden relative" style={{ backgroundColor: 'var(--bg-void)' }}>
      {renderSidebar()}
      
      <div className={`flex-1 flex flex-col bg-grid relative z-40 ${!userId ? 'hidden lg:flex' : 'flex'}`}>
        {!userId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20">
            <MessageCircle size={64} className="mb-4" />
            <p className="font-display text-xs tracking-widest">SELECT A CONVERSATION</p>
          </div>
        ) : (
          <motion.div 
            key={userId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="glass-strong flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <button onClick={() => navigate('/messages')} className="p-2 hover:bg-hover rounded-full transition-colors lg:hidden">
                <ArrowLeft size={18} />
              </button>
              {activeUser && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                    <img src={activeUser.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${activeUser.username}`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{activeUser.username}</p>
                    {typing && (
                      <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="text-[10px] text-accent-success font-bold">typing...</motion.p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingChat && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                  <div className="skeleton h-12 w-48 rounded-2xl mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="skeleton h-12 w-48 rounded-2xl mb-4 self-end" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="skeleton h-12 w-48 rounded-2xl" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map(msg => {
                    const isMine = msg.sender_id === currentUserId
                    const isShare = msg.message?.startsWith('share:')
                    const [_, type, id] = isShare ? msg.message.split(':') : []

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl group relative ${isMine ? 'msg-sent' : 'msg-received'}`}>
                          {isShare && (type === 'reel' || type === 'post') && <SharedContent contentId={id} />}
                          <div className="flex justify-between items-start gap-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">
                              {isShare ? `Shared a ${type}` : msg.message}
                            </p>
                            {isMine && (
                              <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2 hover:text-red-300">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] mt-1.5 opacity-60 text-right">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Overlay */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-20 left-4 z-50 glass-strong p-3 rounded-2xl grid grid-cols-6 gap-2 border border-accent-primary/20">
                  {emojis.map(e => <button key={e} onClick={() => addEmoji(e)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg transition-colors">{e}</button>)}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={sendMessage} className="p-4 border-t flex items-center gap-3" style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <button 
                type="button" 
                onClick={() => setShowEmoji(!showEmoji)}
                className={`p-2 rounded-xl hover:bg-hover transition-colors ${showEmoji ? 'text-accent-primary' : ''}`}
                style={{ color: showEmoji ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              >
                <Smile size={20} />
              </button>
              <input value={text} onChange={handleTyping} placeholder="Write a message..." className="cyber-input flex-1 px-4 py-2.5 text-sm" style={{ backgroundColor: 'var(--bg-void)' }} />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="w-10 h-10 rounded-xl flex items-center justify-center btn-gradient text-white shadow-neon-primary">
                <Send size={16} />
              </motion.button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  )
}
