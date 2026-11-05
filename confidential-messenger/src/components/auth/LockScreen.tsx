'use client';
import { motion } from 'framer-motion';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900/50">
      <div className="absolute inset-0 backdrop-blur-3xl" />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 flex items-center justify-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </motion.div>
        <h1 className="text-3xl font-bold text-white">Locked</h1>
        <p className="text-slate-400">Unlock with Passkey</p>
        <motion.button
          onClick={onUnlock}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-cyan-400 text-black font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
        >
          Unlock
        </motion.button>
      </motion.div>
    </div>
  );
}
