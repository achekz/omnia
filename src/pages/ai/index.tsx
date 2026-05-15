// Role du fichier: affiche une page React de l application.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  FileText,
  History,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/api-client";

interface Message {
  role: "user" | "ai";
  text: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

function createMessage(role: Message["role"], text: string): Message {
  return {
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

function normalizeStoredMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message): message is Partial<Message> => {
      return (
        typeof message === "object" &&
        message !== null &&
        (message as Partial<Message>).role !== undefined &&
        typeof (message as Partial<Message>).text === "string"
      );
    })
    .map((message, index) => ({
      role: message.role === "user" ? "user" : "ai",
      text: message.text || "",
      createdAt: message.createdAt || new Date(Date.now() - (value.length - index) * 1000).toISOString(),
    }));
}

function createConversationId() {
  return globalThis.crypto?.randomUUID?.() || `conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createConversationTitle(text: string) {
  const cleanText = text.trim().replace(/\s+/g, " ");
  if (!cleanText) {
    return "Nouvelle conversation";
  }

  return cleanText.length > 48 ? `${cleanText.slice(0, 48)}...` : cleanText;
}

function normalizeStoredConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.every((item) => typeof item === "object" && item !== null && "messages" in item)) {
    return value
      .map((item): Conversation | null => {
        const source = item as Partial<Conversation>;
        const messages = normalizeStoredMessages(source.messages);
        if (messages.length === 0) {
          return null;
        }

        return {
          id: source.id || createConversationId(),
          title: source.title || createConversationTitle(messages.find((message) => message.role === "user")?.text || messages[0]?.text || ""),
          createdAt: source.createdAt || messages[0]?.createdAt || new Date().toISOString(),
          updatedAt: source.updatedAt || messages[messages.length - 1]?.createdAt || new Date().toISOString(),
          messages,
        };
      })
      .filter((conversation): conversation is Conversation => conversation !== null);
  }

  const migratedMessages = normalizeStoredMessages(value);
  if (migratedMessages.length === 0) {
    return [];
  }

  return [
    {
      id: createConversationId(),
      title: createConversationTitle(migratedMessages.find((message) => message.role === "user")?.text || migratedMessages[0]?.text || ""),
      createdAt: migratedMessages[0]?.createdAt || new Date().toISOString(),
      updatedAt: migratedMessages[migratedMessages.length - 1]?.createdAt || new Date().toISOString(),
      messages: migratedMessages,
    },
  ];
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// Role: Affiche et organise cet ecran.
export default function AIDashboard() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyStorageKey = `omni_ai_chat_conversations_${user?._id || user?.id || user?.email || "guest"}`;
  const legacyHistoryStorageKey = `omni_ai_chat_history_${user?._id || user?.id || user?.email || "guest"}`;
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (firstConversation, secondConversation) =>
          new Date(secondConversation.updatedAt).getTime() - new Date(firstConversation.updatedAt).getTime(),
      ),
    [conversations],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    const storedHistory = localStorage.getItem(historyStorageKey) || localStorage.getItem(legacyHistoryStorageKey);
    if (!storedHistory) {
      setMessages([]);
      setActiveConversationId(null);
      return;
    }

    try {
      const storedConversations = normalizeStoredConversations(JSON.parse(storedHistory));
      setConversations(storedConversations);
      setMessages([]);
      setActiveConversationId(null);
      localStorage.setItem(historyStorageKey, JSON.stringify(storedConversations));
    } catch {
      localStorage.removeItem(historyStorageKey);
      localStorage.removeItem(legacyHistoryStorageKey);
    }
  }, [historyStorageKey, legacyHistoryStorageKey, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    localStorage.setItem(historyStorageKey, JSON.stringify(conversations));
  }, [conversations, historyStorageKey, user]);

  if (!user) {
    return (
      <ModuleLayout activeItem="ia">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </ModuleLayout>
    );
  }

  const suggestions = [
    "Analyser mes tâches",
    "Optimiser mon planning",
    "Gérer mon équipe",
    "Automatiser mon CRM",
  ];

  const saveConversationMessages = (conversationId: string, nextMessages: Message[]) => {
    const now = new Date().toISOString();
    setConversations((previousConversations) => {
      const existingConversation = previousConversations.find((conversation) => conversation.id === conversationId);
      const nextConversation: Conversation = {
        id: conversationId,
        title:
          existingConversation?.title ||
          createConversationTitle(nextMessages.find((message) => message.role === "user")?.text || nextMessages[0]?.text || ""),
        createdAt: existingConversation?.createdAt || nextMessages[0]?.createdAt || now,
        updatedAt: now,
        messages: nextMessages,
      };

      return [
        nextConversation,
        ...previousConversations.filter((conversation) => conversation.id !== conversationId),
      ];
    });
  };

  const openConversation = (conversation: Conversation) => {
    setMessages(conversation.messages);
    setActiveConversationId(conversation.id);
    setIsHistoryOpen(false);
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setPrompt("");
    setIsHistoryOpen(false);
  };

  // Role: Envoie un message ou une notification.
  const sendMessage = async (message?: string) => {
    const textToSend = message || prompt.trim();
    if (!textToSend) {
      return;
    }

    const conversationId = activeConversationId || createConversationId();
    setActiveConversationId(conversationId);

    const userMessage = createMessage("user", textToSend);
    setMessages((prev) => {
      const nextMessages = [...prev, userMessage];
      saveConversationMessages(conversationId, nextMessages);
      return nextMessages;
    });
    setPrompt("");
    setIsLoading(true);

    try {
      const res = await apiClient.post("/ai/chat", { message: textToSend });
      const aiResponse =
        res.data?.reply ||
        "Je suis en train d'analyser votre demande. Veuillez réessayer.";

      setMessages((prev) => {
        const nextMessages = [...prev, createMessage("ai", aiResponse)];
        saveConversationMessages(conversationId, nextMessages);
        return nextMessages;
      });
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Une erreur s'est produite. Veuillez réessayer.";

      setMessages((prev) => {
        const nextMessages = [...prev, createMessage("ai", errorMessage || "Une erreur s'est produite. Veuillez réessayer.")];
        saveConversationMessages(conversationId, nextMessages);
        return nextMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showChat = messages.length > 0;

  return (
    <ModuleLayout activeItem="ia">
      <div className="min-h-[calc(100dvh-64px)] bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 hidden w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none sm:block" />
        <div className="absolute bottom-0 left-0 hidden w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none sm:block" />

        <div className="w-full max-w-4xl relative z-10 flex flex-col items-center h-full">
          <div className="w-full flex justify-end mb-8">
            <div className="flex flex-wrap justify-end gap-2">
              {showChat && (
                <button
                  onClick={startNewConversation}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Nouvelle conversation
                </button>
              )}
              <button
                onClick={() => setIsHistoryOpen((current) => !current)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <History className="w-4 h-4" />
                Historique
              </button>
            </div>
          </div>

          {isHistoryOpen && (
            <div className="w-full max-w-3xl mb-6 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Historique de conversation</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Conversations triees par date, du plus recent au plus ancien.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  aria-label="Fermer l'historique"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {sortedConversations.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-gray-700">
                    Aucun historique pour le moment.
                  </p>
                ) : (
                  sortedConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openConversation(conversation)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        conversation.id === activeConversationId
                          ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/50 dark:bg-blue-950/40 dark:text-blue-100"
                          : "border-gray-200 bg-slate-50 text-slate-800 hover:border-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-bold">
                          {conversation.title}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatHistoryDate(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {conversation.messages.find((storedMessage) => storedMessage.role === "user")?.text ||
                          conversation.messages[0]?.text ||
                          "Conversation"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

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
                    <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">{formatHistoryDate(msg.createdAt)}</p>
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
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-slate-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                  Comment puis-je vous aider ?
                </h1>
                <p className="text-base md:text-xl text-slate-600 font-medium tracking-wide">
                  Optimisez vos processus métier avec l'intelligence artificielle
                </p>
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
              <div className="flex flex-col gap-3 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
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
