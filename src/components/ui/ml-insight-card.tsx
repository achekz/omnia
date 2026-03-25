import { motion } from "framer-motion";
import { BrainCircuit, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MLInsightCardProps {
  prediction: string;
  confidence: number;
  factors?: string[];
  type?: "prediction" | "recommendation";
  className?: string;
}

export function MLInsightCard({ prediction, confidence, factors = [], type = "prediction", className }: MLInsightCardProps) {
  return (
    <div className={cn("glass-panel rounded-2xl p-5 border border-primary/20 relative overflow-hidden", className)}>
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            {type === 'prediction' ? <BrainCircuit className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">AI Insight</h4>
            <p className="text-xs text-muted-foreground">Confidence: {confidence}%</p>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-lg font-medium text-primary-foreground mb-4">{prediction}</p>
        
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Factors</p>
          <ul className="flex flex-wrap gap-2">
            {factors.map((factor, i) => (
              <li key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-white/5">
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Confidence Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  );
}
