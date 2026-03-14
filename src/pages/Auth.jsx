import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { signIn, signUp } from '../services/supabaseClient'
import { useSEO } from '../hooks/useSEO'

export default function Auth() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(params.get('mode') === 'signup')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', username: '' })
  const redirect = params.get('redirect') || '/home'

  useSEO(isSignUp ? 'Join Vangapalagalam' : 'Enter the Network', 'Access the future of social networking.')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        if (!form.username.trim()) return toast.error('Username required')
        if (form.username.length < 3) return toast.error('Username too short')
        await signUp(form.email, form.password, form.username)
        toast.success('Account created! Welcome to Vangapalagalam')
      } else {
        await signIn(form.email, form.password)
        toast.success('Welcome back!')
      }
      
      setTimeout(() => {
        navigate(redirect, { replace: true })
      }, 500)
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid flex items-center justify-center p-4">
      <div className="orb orb-purple w-80 h-80 top-0 left-0 fixed" />
      <div className="orb orb-pink w-72 h-72 bottom-0 right-0 fixed" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-8 text-sm btn-ghost px-3 py-2">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="glass-strong rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block w-16 h-16 rounded-full mb-4"
              style={{ background: 'conic-gradient(var(--accent-primary), var(--accent-tertiary), var(--accent-secondary), var(--accent-primary))', padding: '2.5px' }}>
              <div className="w-full h-full bg-void rounded-full flex items-center justify-center">
                <span className="font-display font-black text-sm text-gradient">VP</span>
              </div>
            </div>
            <h1 className="font-display font-bold text-base tracking-widest text-gradient mb-1">
              VANGAPALAGALAM
            </h1>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {isSignUp ? 'Create your node' : 'Access the network'}
            </p>
          </div>

          <div className="flex rounded-xl overflow-hidden mb-6 p-1"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            {['Sign In', 'Sign Up'].map((label, i) => (
              <button
                key={label}
                onClick={() => setIsSignUp(i === 1)}
                className="flex-1 py-2.5 rounded-lg text-xs font-display tracking-wider transition-all duration-300 font-semibold"
                style={{
                  background: (isSignUp === (i === 1)) ? 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(255,107,157,0.1))' : 'transparent',
                  color: (isSignUp === (i === 1)) ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: (isSignUp === (i === 1)) ? '1px solid rgba(108,99,255,0.3)' : '1px solid transparent',
                }}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="block text-xs mb-2 tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
                    USERNAME
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-primary opacity-60" />
                    <input
                      type="text"
                      className="cyber-input w-full pl-10 pr-4 py-3 text-sm"
                      placeholder="your_username"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs mb-2 tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
                EMAIL
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-primary opacity-60" />
                <input
                  type="email"
                  required
                  className="cyber-input w-full pl-10 pr-4 py-3 text-sm"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-2 tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
                PASSWORD
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-primary opacity-60" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  className="cyber-input w-full pl-10 pr-10 py-3 text-sm"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-display text-xs tracking-widest font-bold transition-all duration-300 mt-2 flex items-center justify-center gap-2"
              style={{
                background: loading ? 'rgba(108,99,255,0.1)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: loading ? 'var(--text-muted)' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px var(--glow-primary)',
              }}
            >
              {loading ? 'CONNECTING...' : (isSignUp ? <><Sparkles size={14} /> CREATE ACCOUNT</> : 'ENTER')}
            </motion.button>
          </form>

          <p className="text-center mt-5 font-mono" style={{ color: 'var(--text-faint)', fontSize: '0.65rem' }}>
            Try: demo@vpg.com / demo1234
          </p>
        </div>
      </motion.div>
    </div>
  )
}
