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
            background: 'conic-gradient(var(--neon-cyan), var(--neon-purple), var(--neon-pink), var(--neon-cyan))',
            padding: '2px'
          }}
        >
          <div className="w-full h-full bg-void rounded-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-neon-cyan" style={{ boxShadow: '0 0 10px var(--neon-cyan)' }} />
          </div>
        </motion.div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-display text-xs tracking-widest text-neon-cyan uppercase"
        >
          Initializing...
        </motion.p>
      </div>
    </div>
  )
}
