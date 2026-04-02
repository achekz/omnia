import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { Mic, Send, Paperclip, FileText, BarChart3, Users, Target, Activity } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function AIDashboard() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");

  if (!user) {
    return (
      <ModuleLayout activeItem="ia">
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </ModuleLayout>
    );
  }

  const domains = [
    { label: "Ventes", icon: <BarChart3 className="w-4 h-4 text-emerald-500" /> },
    { label: "RH", icon: <Users className="w-4 h-4 text-orange-500" /> },
    { label: "CRM", icon: <Target className="w-4 h-4 text-blue-500" /> },
    { label: "Analyses", icon: <Activity className="w-4 h-4 text-purple-500" /> },
  ];

  const suggestions = [
    "Analyser mes ventes",
    "Optimiser mes dépenses",
    "Gérer mon équipe",
    "Automatiser mon CRM"
  ];

  return (
    <ModuleLayout activeItem="ia">
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Decorative Blur Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
          
          <div className="w-full flex justify-end mb-8">
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-600 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
              <Activity className="w-4 h-4" />
              Historique
            </button>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl md:text-6xl font-display font-extrabold tracking-tight text-slate-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              Comment puis-je vous aider ?
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-medium tracking-wide">
              Optimisez vos processus métier avec l'intelligence artificielle
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {domains.map((domain, i) => (
              <button 
                key={i} 
                className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full text-sm font-bold text-slate-700 shadow-sm border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                {domain.icon}
                {domain.label}
              </button>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-3xl"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-indigo-500/10 border border-white/60 mb-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez votre besoin : analyse, prédiction, automatisation... Notre IA s'occupe du reste."
                className="w-full h-32 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none px-2 text-lg font-medium"
              />
              <div className="flex items-center justify-between mt-4 border-t border-gray-100 pt-3">
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold text-slate-600 transition-colors border border-gray-200">
                    <Paperclip className="w-4 h-4" />
                    Files
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold text-slate-600 transition-colors border border-gray-200">
                    <FileText className="w-4 h-4" />
                    Documents
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={!prompt.trim()}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all disabled:opacity-50 disabled:scale-100 hover:scale-105 shadow-lg shadow-blue-500/30"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {suggestions.map((sug, i) => (
                <button 
                  key={i}
                  onClick={() => setPrompt(sug)}
                  className="px-4 py-2 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:text-blue-600 transition-colors border border-white"
                >
                  {sug}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-sm text-slate-400 font-medium"
          >
            Propulsé par l'IA • Sécurisé • Disponible 24/7
          </motion.p>
        </div>
      </div>
    </ModuleLayout>
  );
}
