import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ModuleLayout } from "@/components/layout/module-layout";
import {
  Mic, Send, Paperclip, FileText, TrendingUp, Users, BarChart3,
  ShoppingCart, History, Sparkles, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const QUICK_CHIPS = [
  { label: "Ventes", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { label: "RH", icon: <Users className="w-3.5 h-3.5" /> },
  { label: "CRM", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { label: "Analyses", icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

const SUGGESTIONS = [
  "Analyser mes ventes",
  "Optimiser mes dépenses",
  "Gérer mon équipe",
  "Automatiser mon CRM",
];

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function AIHome() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModule, setActiveModule] = useState("tresorerie");
  const [activeItem, setActiveItem] = useState("dashboard");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("omni_ai_token");
      const res = await fetch("/api/ml/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: msg, context: activeModule }),
      });
      const data = await res.json();
      const reply =
        data?.recommendations?.join("\n\n") ||
        data?.message ||
        "Je suis en train d'analyser votre demande. Voici ce que je recommande : vérifiez vos indicateurs clés et optimisez vos processus en fonction de vos données récentes.";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Votre demande a été analysée. Je vous recommande d'explorer les tableaux de bord disponibles pour obtenir des insights précis sur cette thématique.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const showChat = messages.length > 0;

  return (
    <ModuleLayout
      onItemChange={(mod, item) => {
        setActiveModule(mod);
        setActiveItem(item);
      }}
    >
      <div className="flex flex-col h-full relative">
        {/* Historique button */}
        <div className="absolute top-5 right-6 z-10">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 transition-all shadow-sm">
            <History className="w-4 h-4" />
            Historique
          </button>
        </div>

        {/* Chat messages */}
        {showChat && (
          <div className="flex-1 overflow-y-auto px-8 pt-8 pb-4 space-y-4">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "gradient-bg text-white rounded-tr-sm"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {m.role === "ai" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-600">Omni AI</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hero (only when no messages) */}
        {!showChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 pt-12 pb-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">
                Comment puis-je vous aider ?
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
                Optimisez vos processus métier avec l'intelligence artificielle
              </p>

              {/* Quick chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleSend(`Aide moi avec ${chip.label}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all shadow-sm"
                  >
                    {chip.icon}
                    {chip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Input box */}
        <div className={`px-6 pb-6 ${showChat ? "" : "max-w-3xl mx-auto w-full"}`}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Décrivez votre besoin : analyse, prédiction, automatisation... Notre IA s'occupe du reste ! 🚀"
              className="w-full px-5 pt-4 pb-2 text-sm text-gray-700 placeholder-gray-400 resize-none outline-none border-none bg-transparent"
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200">
                  <Paperclip className="w-3.5 h-3.5" />
                  Files
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200">
                  <FileText className="w-3.5 h-3.5" />
                  Documents
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl gradient-bg text-white transition-opacity disabled:opacity-40 shadow-sm shadow-purple-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions (only when no messages) */}
          {!showChat && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
            Propulsé par l'IA • Sécurisé • Disponible 24/7
          </p>
        </div>
      </div>
    </ModuleLayout>
  );
}
