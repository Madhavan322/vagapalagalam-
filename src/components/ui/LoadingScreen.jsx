import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-void flex items-center justify-center z-[100]"
    >
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
          <div className="w-full h-full bg-void rounded-full flex items-center justify-center border border-white/5">
            <div className="w-4 h-4 rounded-full" style={{ background: 'var(--accent-primary)', boxShadow: '0 0 15px var(--glow-primary)' }} />
          </div>
        </motion.div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-display text-xs tracking-[0.3em] text-accent-primary uppercase font-bold"
        >
          Initializing...
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5 }}
          className="mt-8"
        >
          <button 
            onClick={() => {
              import('../../context/authStore').then(m => {
                m.useAuthStore.setState({ loading: false })
              })
            }}
            className="text-[10px] font-mono text-muted hover:text-accent-secondary transition-colors underline decoration-accent-secondary/30 underline-offset-4"
          >
            STUCK? SKIP INITIALIZATION
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
