import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Send, Check } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useAuthStore } from '../../context/authStore'
import toast from 'react-hot-toast'

export default function ShareModal({ item, type = 'reel', onClose }) {
  const { user } = useAuthStore()
  const [following, setFollowing] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchFollowing()
  }, [])

  const fetchFollowing = async () => {
    try {
      const { data } = await supabase
        .from('followers')
        .select('following:following_id(id, username, avatar)')
        .eq('follower_id', user.id)
      setFollowing(data?.map(d => d.following) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleShare = async () => {
    if (selected.length === 0) return
    setSending(true)
    try {
      const shareContent = `share:${type}:${item.id}`
      const messages = selected.map(targetId => ({
        sender_id: user.id,
        receiver_id: targetId,
        message: shareContent,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase.from('messages').insert(messages)
      if (error) throw error

      toast.success(`Shared with ${selected.length} people!`)
      onClose()
    } catch (e) {
      toast.error('Failed to share')
    } finally {
      setSending(false)
    }
  }

  const filtered = following.filter(f => 
    f.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm glass-strong rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display text-xs tracking-widest font-bold">SHARE</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people..." 
              className="cyber-input w-full pl-9 pr-4 py-2 text-sm"
            />
          </div>

          <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: '40vh' }}>
            {loading ? (
              [1,2,3].map(i => <div key={i} className="skeleton h-12 w-full rounded-xl mb-2" />)
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-xs opacity-50 font-mono">NO FOLLOWERS FOUND</p>
            ) : (
              filtered.map(f => (
                <div 
                  key={f.id}
                  onClick={() => toggleSelect(f.id)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <img src={f.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${f.username}`} className="w-10 h-10 rounded-full bg-panel" />
                  <span className="flex-1 text-sm font-semibold">{f.username}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    selected.includes(f.id) ? 'bg-accent-primary border-accent-primary' : 'border-white/20'
                  }`}>
                    {selected.includes(f.id) && <Check size={12} className="text-white" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-white/10">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={selected.length === 0 || sending}
            onClick={handleShare}
            className="w-full btn-gradient py-3 rounded-xl font-display text-xs tracking-widest font-bold disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {sending ? 'SENDING...' : <><Send size={14} /> SEND TO {selected.length} PEOPLE</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
