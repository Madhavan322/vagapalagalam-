import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-void flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-6 rounded-full"
          style={{
            background: 'conic-gradient(var(--accent-primary), var(--accent-tertiary), var(--accent-secondary), var(--accent-primary))',
            padding: '2.5px'
          }}
        >
          <div className="w-full h-full bg-void rounded-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full" style={{ background: 'var(--accent-primary)', boxShadow: '0 0 12px var(--glow-primary)' }} />
          </div>
        </motion.div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-display text-xs tracking-widest text-accent-primary uppercase font-semibold"
        >
          Initializing...
        </motion.p>
      </div>
    </div>
  )
}
