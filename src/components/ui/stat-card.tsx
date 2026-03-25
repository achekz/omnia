import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, trendLabel, className, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "glass-panel rounded-2xl p-6 relative overflow-hidden group",
        className
      )}
    >
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity duration-500 transform group-hover:scale-110 group-hover:-rotate-12">
        {icon}
      </div>
      
      <div className="relative z-10">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-3xl font-display font-bold text-foreground mb-2">{value}</h3>
        
        {trend !== undefined && (
          <div className="flex items-center text-sm">
            <span className={cn(
              "flex items-center font-medium",
              trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-muted-foreground"
            )}>
              {trend > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : 
               trend < 0 ? <ArrowDownRight className="w-4 h-4 mr-1" /> : 
               <Minus className="w-4 h-4 mr-1" />}
              {Math.abs(trend)}%
            </span>
            {trendLabel && <span className="text-muted-foreground ml-2">{trendLabel}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
