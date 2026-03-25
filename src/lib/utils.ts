import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getRiskColor(riskLevel: string) {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'high': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  }
}
