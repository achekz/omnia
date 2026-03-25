import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface AnomalyAlertProps {
  message: string;
  score: number;
}

export function AnomalyAlert({ message, score }: AnomalyAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        className="mb-6 rounded-xl p-4 bg-gradient-to-r from-rose-500/20 to-rose-500/5 border border-rose-500/30 shadow-lg shadow-rose-500/10 flex items-start gap-4"
      >
        <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-rose-100 font-semibold mb-1 flex items-center gap-2">
            Anomaly Detected
            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500 text-white font-bold">
              Score: {score}/100
            </span>
          </h4>
          <p className="text-sm text-rose-200/80">{message}</p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
