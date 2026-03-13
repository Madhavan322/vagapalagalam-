import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, Shield, Globe, ChevronRight } from 'lucide-react'

const features = [
  { icon: Zap, title: 'Real-Time Connections', desc: 'Experience instant messaging and live content updates powered by Supabase Realtime.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your data, your control. End-to-end encrypted messages and secure authentication.' },
  { icon: Globe, title: 'Global Community', desc: 'Connect with creators worldwide. Share stories, reels, and moments that matter.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col">
      {/* Background orbs */}
      <div className="orb orb-cyan w-96 h-96 top-0 left-0 fixed" />
      <div className="orb orb-purple w-80 h-80 bottom-0 right-0 fixed" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between p-6"
      >
        <div className="font-display font-bold text-sm tracking-widest gradient-text">
          VANGAPALAGALAM
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
          <div className="relative inline-block mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-32 h-32 mx-auto rounded-full"
              style={{
                background: 'conic-gradient(var(--neon-cyan), var(--neon-purple), var(--neon-pink), var(--neon-green), var(--neon-cyan))',
                padding: '2px'
              }}
            >
              <div className="w-full h-full bg-void rounded-full flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="font-display font-black text-2xl gradient-text"
                >
                  VP
                </motion.div>
              </div>
            </motion.div>
            {/* Orbiting dots */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  top: '50%', left: '50%',
                  background: ['var(--neon-cyan)', 'var(--neon-purple)', 'var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)', 'var(--neon-purple)'][i],
                  boxShadow: `0 0 6px ${['var(--neon-cyan)', 'var(--neon-purple)', 'var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)', 'var(--neon-purple)'][i]}`
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
                transformTemplate={({ rotate }) => `rotate(${rotate}) translateX(72px) rotate(-${rotate})`}
              />
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display font-black text-4xl md:text-6xl mb-4"
          >
            <span className="gradient-text">THE FUTURE</span>
            <br />
            <span style={{ color: 'rgba(224,224,255,0.6)' }}>OF SOCIAL</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg max-w-md mx-auto mb-10"
            style={{ color: 'rgba(224,224,255,0.5)', fontFamily: 'Syne, sans-serif' }}
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
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-display text-xs tracking-widest"
              style={{
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                color: 'var(--void)',
                fontWeight: 700
              }}
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
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass rounded-2xl p-6 text-left holo-card"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.2)' }}>
                <Icon size={18} style={{ color: 'var(--neon-cyan)' }} />
              </div>
              <h3 className="font-display text-xs font-bold tracking-wider mb-2" style={{ color: 'var(--neon-cyan)' }}>
                {title}
              </h3>
              <p className="text-sm" style={{ color: 'rgba(224,224,255,0.5)', lineHeight: 1.6 }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 text-center p-6"
        style={{ color: 'rgba(224,224,255,0.2)', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace' }}
      >
        VANGAPALAGALAM © 2025 — WHERE WORLDS CONNECT
      </motion.footer>
    </div>
  )
}
