import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/api-client";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function AIDashboard() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return (
      <ModuleLayout activeItem="ia">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
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
    "Automatiser mon CRM",
  ];

  const sendMessage = async (message?: string) => {
    const textToSend = message || prompt.trim();
    if (!textToSend) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setPrompt("");
    setIsLoading(true);

    try {
      const res = await apiClient.post("/ai/ask", { message: textToSend });
      const aiResponse =
        res.data?.response ||
        res.data?.data?.response ||
        "Je suis en train d'analyser votre demande. Veuillez réessayer.";

      setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Une erreur s'est produite. Veuillez réessayer.";

      setMessages((prev) => [...prev, { role: "ai", text: errorMessage || "Une erreur s'est produite. Veuillez réessayer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const showChat = messages.length > 0;

  return (
    <ModuleLayout activeItem="ia">
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        <div className="w-full max-w-4xl relative z-10 flex flex-col items-center h-full">
          <div className="w-full flex justify-end mb-8">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Activity className="w-4 h-4" />
              Historique
            </button>
          </div>

          {showChat && (
            <div className="flex-1 overflow-y-auto w-full max-w-3xl mb-6 space-y-4 px-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={`${msg.role}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.role === "ai" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-600">Omni AI</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Réflexion en cours...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!showChat && (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
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
                {domains.map((domain) => (
                  <button
                    key={domain.label}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600 hover:shadow-md dark:hover:bg-gray-800 transition-all hover:-translate-y-0.5"
                  >
                    {domain.icon}
                    {domain.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-3xl"
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-indigo-500/10 border border-white/60 dark:border-gray-700/60 mb-6">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !isLoading) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Décrivez votre besoin : analyse, prédiction, automatisation... Notre IA s'occupe du reste."
                className="w-full h-32 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none px-2 text-lg font-medium"
              />
              <div className="flex items-center justify-between mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 transition-colors border border-gray-200 dark:border-gray-700">
                    <Paperclip className="w-4 h-4" />
                    Files
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 transition-colors border border-gray-200 dark:border-gray-700">
                    <FileText className="w-4 h-4" />
                    Documents
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!prompt.trim() || isLoading}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all disabled:opacity-50 disabled:scale-100 hover:scale-105 shadow-lg shadow-blue-500/30"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {!showChat && (
              <div className="flex flex-wrap justify-center gap-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void sendMessage(suggestion)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-white dark:border-gray-700 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-sm text-slate-400 font-medium">
            Propulsé par l'IA • Sécurisé • Disponible 24/7
          </motion.p>
        </div>
      </div>
    </ModuleLayout>
  );
}
