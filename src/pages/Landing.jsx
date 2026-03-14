import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, Shield, Globe, ChevronRight, Sparkles } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'

const features = [
  { icon: Zap, title: 'Real-Time Connections', desc: 'Experience instant messaging and live content updates powered by Supabase Realtime.', color: 'var(--accent-primary)' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your data, your control. End-to-end encrypted messages and secure authentication.', color: 'var(--accent-secondary)' },
  { icon: Globe, title: 'Global Community', desc: 'Connect with creators worldwide. Share stories, reels, and moments that matter.', color: 'var(--accent-tertiary)' },
]

export default function Landing() {
  const navigate = useNavigate()
  useSEO('Welcome', 'Join the next-generation social universe where communities thrive beyond the ordinary.')

  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col">
      {/* Background orbs */}
      <div className="orb orb-purple w-96 h-96 top-0 left-0 fixed" />
      <div className="orb orb-pink w-80 h-80 bottom-0 right-0 fixed" />
      <div className="orb orb-cyan w-64 h-64 top-1/2 left-1/2 fixed" style={{ transform: 'translate(-50%, -50%)' }} />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between p-6"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent-primary" />
          <div className="font-display font-bold text-sm tracking-widest text-gradient">
            VANGAPALAGALAM
          </div>
        </div>
        <button onClick={() => navigate('/auth')} className="btn-ghost text-sm">
          Sign In
        </button>
      </motion.header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated logo */}
          <div className="relative inline-block mb-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-36 h-36 mx-auto rounded-full"
              style={{
                background: 'conic-gradient(var(--accent-primary), var(--accent-tertiary), var(--accent-secondary), var(--accent-success), var(--accent-primary))',
                padding: '3px'
              }}
            >
              <div className="w-full h-full bg-void rounded-full flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="font-display font-black text-3xl text-gradient"
                >
                  VP
                </motion.div>
              </div>
            </motion.div>
            {/* Orbiting dots */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{
                  top: '50%', left: '50%',
                  background: ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-tertiary)', 'var(--accent-success)', 'var(--accent-primary)', 'var(--accent-secondary)'][i],
                  boxShadow: `0 0 10px ${['var(--glow-primary)', 'var(--glow-secondary)', 'var(--glow-tertiary)', 'rgba(16,185,129,0.4)', 'var(--glow-primary)', 'var(--glow-secondary)'][i]}`
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
                transformTemplate={({ rotate }) => `rotate(${rotate}) translateX(80px) rotate(-${rotate})`}
              />
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display font-black text-4xl md:text-6xl mb-5"
          >
            <span className="text-gradient">THE FUTURE</span>
            <br />
            <span style={{ color: 'var(--text-secondary)' }}>OF SOCIAL</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg max-w-md mx-auto mb-10"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            A next-generation social universe where communities thrive beyond the ordinary.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth?mode=signup')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-display text-xs tracking-widest btn-gradient"
            >
              ENTER THE NETWORK <ChevronRight size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="btn-primary px-8 py-4"
            >
              SIGN IN
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl w-full"
        >
          {features.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              whileHover={{ y: -6, scale: 1.02 }}
              className="card-glass rounded-2xl p-6 text-left holo-card"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="font-display text-xs font-bold tracking-wider mb-2" style={{ color }}>
                {title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 text-center p-6 font-mono"
        style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}
      >
        VANGAPALAGALAM © 2025 — WHERE WORLDS CONNECT
      </motion.footer>
    </div>
  )
}
