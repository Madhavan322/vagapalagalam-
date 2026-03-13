import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { signIn, signUp } from '../services/supabaseClient'

export default function Auth() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(params.get('mode') === 'signup')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', username: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        if (!form.username.trim()) return toast.error('Username required')
        if (form.username.length < 3) return toast.error('Username too short')
        await signUp(form.email, form.password, form.username)
        toast.success('Account created! Welcome to Vangapalagalam')
        navigate('/home')
      } else {
        await signIn(form.email, form.password)
        toast.success('Welcome back!')
        navigate('/home')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid flex items-center justify-center p-4">
      <div className="orb orb-cyan w-80 h-80 top-0 left-0 fixed" />
      <div className="orb orb-purple w-72 h-72 bottom-0 right-0 fixed" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Back button */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-8 text-sm btn-ghost px-3 py-2">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block w-14 h-14 rounded-full mb-4"
              style={{ background: 'conic-gradient(var(--neon-cyan), var(--neon-purple), var(--neon-pink), var(--neon-cyan))', padding: '2px' }}>
              <div className="w-full h-full bg-void rounded-full flex items-center justify-center">
                <span className="font-display font-black text-sm gradient-text">VP</span>
              </div>
            </div>
            <h1 className="font-display font-bold text-base tracking-widest gradient-text mb-1">
              VANGAPALAGALAM
            </h1>
            <p style={{ color: 'rgba(224,224,255,0.4)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono' }}>
              {isSignUp ? 'Create your node' : 'Access the network'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex rounded-xl overflow-hidden mb-6 p-1"
            style={{ background: 'rgba(10,10,18,0.8)', border: '1px solid rgba(0,245,255,0.1)' }}>
            {['Sign In', 'Sign Up'].map((label, i) => (
              <button
                key={label}
                onClick={() => setIsSignUp(i === 1)}
                className="flex-1 py-2 rounded-lg text-xs font-display tracking-wider transition-all duration-300"
                style={{
                  background: (isSignUp === (i === 1)) ? 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(191,0,255,0.15))' : 'transparent',
                  color: (isSignUp === (i === 1)) ? 'var(--neon-cyan)' : 'rgba(224,224,255,0.4)',
                  border: (isSignUp === (i === 1)) ? '1px solid rgba(0,245,255,0.3)' : '1px solid transparent',
                }}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="block text-xs mb-2 tracking-wider" style={{ color: 'rgba(224,224,255,0.5)', fontFamily: 'JetBrains Mono' }}>
                    USERNAME
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,245,255,0.5)' }} />
                    <input
                      type="text"
                      className="cyber-input w-full pl-9 pr-4 py-3 text-sm"
                      placeholder="your_username"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs mb-2 tracking-wider" style={{ color: 'rgba(224,224,255,0.5)', fontFamily: 'JetBrains Mono' }}>
                EMAIL
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,245,255,0.5)' }} />
                <input
                  type="email"
                  required
                  className="cyber-input w-full pl-9 pr-4 py-3 text-sm"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-2 tracking-wider" style={{ color: 'rgba(224,224,255,0.5)', fontFamily: 'JetBrains Mono' }}>
                PASSWORD
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,245,255,0.5)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  className="cyber-input w-full pl-9 pr-10 py-3 text-sm"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(224,224,255,0.4)' }}
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
              className="w-full py-3 rounded-xl font-display text-xs tracking-widest font-bold transition-all duration-300 mt-2"
              style={{
                background: loading ? 'rgba(0,245,255,0.1)' : 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                color: loading ? 'rgba(224,224,255,0.3)' : 'var(--void)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'CONNECTING...' : (isSignUp ? 'CREATE ACCOUNT' : 'ENTER')}
            </motion.button>
          </form>

          {/* Demo hint */}
          <p className="text-center mt-4" style={{ color: 'rgba(224,224,255,0.3)', fontSize: '0.65rem', fontFamily: 'JetBrains Mono' }}>
            Try: demo@vpg.com / demo1234
          </p>
        </div>
      </motion.div>
    </div>
  )
}
