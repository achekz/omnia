import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Building2, UserCircle, Briefcase, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = (email: string) => {
    setEmail(email);
    setPassword("");
    setError("");
  };

  const demoAccounts = [
    { type: 'Company Admin', email: 'company@demo.com', icon: <Building2 className="w-5 h-5 text-indigo-500" /> },
    { type: 'Cabinet Admin', email: 'cabinet@demo.com', icon: <Briefcase className="w-5 h-5 text-emerald-500" /> },
    { type: 'Employee', email: 'employee@demo.com', icon: <UserCircle className="w-5 h-5 text-blue-500" /> },
    { type: 'Student', email: 'student@demo.com', icon: <GraduationCap className="w-5 h-5 text-amber-500" /> },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative z-10 bg-white dark:bg-gray-900">
        <div className="max-w-md w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-8 shadow-lg shadow-purple-500/20">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            
            <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your details to access your Omni AI dashboard.</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">Password</label>
                  <a href="#" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl text-base font-semibold text-white gradient-bg hover:opacity-90 shadow-lg shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign in <ArrowRight className="ml-2 w-5 h-5" /></>}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                Sign up
              </Link>
            </p>

            <div className="mt-10">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or use demo accounts</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.type}
                    type="button"
                    onClick={() => handleDemoSelect(demo.email)}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 hover:border-purple-200 dark:hover:border-purple-600 hover:shadow-sm dark:hover:shadow-purple-500/10 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm dark:shadow-md border border-gray-100 dark:border-gray-600 group-hover:scale-110 transition-transform">
                      {demo.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{demo.type}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{demo.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-purple-50 dark:bg-gradient-to-br dark:from-purple-900/50 dark:via-pink-900/30 dark:to-blue-900/40">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-blue-900/30 z-0" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between items-center p-16">
          {/* Logo/Title at center-top */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mt-12"
          >
            <h2 className="text-6xl font-display font-bold gradient-text mb-3">Omni AI</h2>
            <p className="text-lg font-medium tracking-widest gradient-text">PLATFORM · SaaS · IA</p>
          </motion.div>

          {/* Description in center */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-sm w-full"
          >
            <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-3xl p-10 border border-white/60 dark:border-gray-700/60 shadow-2xl">
              <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
                Votre entreprise<br />
                <span className="gradient-text">tout en un.</span>
              </h3>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8 font-light">
                Gérez l'ensemble de votre activité avec une plateforme intelligente. Du ML prédictif à la gestion complète, transformez votre organisation dès aujourd'hui.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mt-2 flex-shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">Prévisions IA et anomalies détectées</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mt-2 flex-shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">12+ modules adaptés à vos besoins</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mt-2 flex-shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">Sécurité d'entreprise garantie</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}