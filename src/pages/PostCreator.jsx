import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Video, Type, Hash, X, UploadCloud, ArrowLeft, Clock } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, uploadMedia } from '../services/supabaseClient'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

const POST_TYPES = [
  { id: 'image',  icon: Image,  label: 'PHOTO',  accept: 'image/*' },
  { id: 'video',  icon: Video,  label: 'VIDEO',  accept: 'video/*' },
  { id: 'text',   icon: Type,   label: 'TEXT',   accept: null      },
  { id: 'story',  icon: Clock,  label: 'STORY',  accept: 'image/*,video/*' },
]

export default function PostCreator() {
  const { user }   = useAuthStore()
  const navigate   = useNavigate()
  const [params]   = useSearchParams()

  const defaultType = params.get('type') || 'image'
  const [postType,   setPostType]   = useState(defaultType)
  const [caption,    setCaption]    = useState('')
  const [hashtags,   setHashtags]   = useState('')
  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [uploading,  setUploading]  = useState(false)
  const [dragOver,   setDragOver]   = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!caption.trim() && !file) {
      toast.error('Add a caption or media!')
      return
    }
    setUploading(true)
    try {
      let mediaUrl = null
      if (file) {
        const bucket = postType === 'story' ? 'stories' : 'media'
        mediaUrl = await uploadMedia(file, bucket)
      }

      const fullCaption = hashtags.trim()
        ? `${caption} ${hashtags.split(' ').map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}`
        : caption

      if (postType === 'story') {
        const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        await supabase.from('stories').insert({
          user_id:    user.id,
          media_url:  mediaUrl,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        })
        toast.success('Story posted! Expires in 24 hours')
      } else {
        await supabase.from('posts').insert({
          user_id:    user.id,
          caption:    fullCaption,
          media_url:  mediaUrl,
          type:       postType === 'text' ? 'text' : file?.type.startsWith('video') ? 'video' : 'image',
          created_at: new Date().toISOString(),
        })
        toast.success('Post published!')
      }
      navigate('/home')
    } catch (e) {
      toast.error('Failed to publish: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => { setFile(null); setPreview(null) }

  const activeType = POST_TYPES.find(t => t.id === postType)

  return (
    <div className="relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 btn-ghost px-3 py-2 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="font-display text-sm font-bold tracking-widest gradient-text">CREATE</h1>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={handleSubmit} disabled={uploading}
          className="btn-primary px-4 py-2 text-xs"
          style={{ opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
          {uploading ? 'POSTING...' : 'PUBLISH'}
        </motion.button>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {POST_TYPES.map(({ id, icon: Icon, label }) => (
          <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => { setPostType(id); clearFile() }}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
            style={{
              background: postType === id ? 'rgba(0,245,255,0.12)' : 'rgba(10,10,18,0.6)',
              border:     postType === id ? '1px solid rgba(0,245,255,0.4)' : '1px solid rgba(0,245,255,0.08)',
            }}>
            <Icon size={18} style={{ color: postType === id ? 'var(--neon-cyan)' : 'rgba(224,224,255,0.4)' }} />
            <span className="text-xs font-display tracking-wider"
              style={{ color: postType === id ? 'var(--neon-cyan)' : 'rgba(224,224,255,0.4)', fontSize: '0.6rem' }}>
              {label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Media upload */}
      {postType !== 'text' && (
        <div className="mb-4">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="relative rounded-xl overflow-hidden" style={{ maxHeight: '320px' }}>
                {postType === 'video' || file?.type?.startsWith('video')
                  ? <video src={preview} controls className="w-full rounded-xl object-contain" style={{ maxHeight: '320px', background: 'black' }} />
                  : <img src={preview} className="w-full rounded-xl object-cover" style={{ maxHeight: '320px' }} />
                }
                <button onClick={clearFile}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <X size={14} className="text-white" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl p-10 text-center cursor-pointer transition-all"
                style={{
                  background: dragOver ? 'rgba(0,245,255,0.08)' : 'rgba(10,10,18,0.6)',
                  border:     `2px dashed ${dragOver ? 'rgba(0,245,255,0.6)' : 'rgba(0,245,255,0.2)'}`,
                }}>
                <UploadCloud size={36} className="mx-auto mb-3" style={{ color: dragOver ? 'var(--neon-cyan)' : 'rgba(224,224,255,0.3)' }} />
                <p className="text-sm mb-1" style={{ color: 'rgba(224,224,255,0.6)' }}>
                  Drop {activeType?.label.toLowerCase()} here or click to browse
                </p>
                <p className="text-xs" style={{ color: 'rgba(224,224,255,0.3)', fontFamily: 'JetBrains Mono' }}>
                  {activeType?.id === 'video' ? 'MP4, WebM, OGG' : 'JPG, PNG, GIF, WebP'}
                </p>
                <input ref={fileRef} type="file" className="hidden"
                  accept={activeType?.accept} onChange={e => handleFile(e.target.files[0])} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Caption */}
      <div className="mb-4">
        <label className="block text-xs mb-2 tracking-wider"
          style={{ color: 'rgba(224,224,255,0.5)', fontFamily: 'JetBrains Mono' }}>CAPTION</label>
        <textarea
          value={caption} onChange={e => setCaption(e.target.value)}
          className="cyber-input w-full px-4 py-3 text-sm resize-none"
          rows={postType === 'text' ? 6 : 3}
          placeholder={postType === 'text' ? 'Share your thoughts with the network...' : 'Write a caption...'}
        />
        <p className="text-right text-xs mt-1" style={{ color: 'rgba(224,224,255,0.25)', fontFamily: 'JetBrains Mono' }}>
          {caption.length}/2200
        </p>
      </div>

      {/* Hashtags */}
      <div className="mb-4">
        <label className="block text-xs mb-2 tracking-wider"
          style={{ color: 'rgba(224,224,255,0.5)', fontFamily: 'JetBrains Mono' }}>
          <Hash size={12} className="inline mr-1" style={{ color: 'var(--neon-purple)' }} />HASHTAGS
        </label>
        <input
          value={hashtags} onChange={e => setHashtags(e.target.value)}
          className="cyber-input w-full px-4 py-3 text-sm"
          placeholder="#cyberpunk #art #vangapalagalam"
        />
      </div>

      {/* Preview card */}
      {(caption || hashtags) && (
        <div className="glass rounded-xl p-4 mb-4">
          <p className="text-xs mb-1" style={{ color: 'rgba(224,224,255,0.4)', fontFamily: 'JetBrains Mono' }}>PREVIEW</p>
          <div className="flex items-center gap-2 mb-2">
            <img src={user?.avatar} className="w-7 h-7 rounded-full" />
            <span className="text-sm font-semibold" style={{ color: '#e0e0ff' }}>{user?.username}</span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(224,224,255,0.7)', lineHeight: 1.5 }}>
            {caption}
            {hashtags && (
              <span style={{ color: 'var(--neon-cyan)' }}>
                {' '}{hashtags.split(' ').map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
