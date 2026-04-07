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
    <div className="min-h-screen bg-white flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative z-10">
        <div className="max-w-md w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-8 shadow-lg shadow-purple-500/20">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            
            <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-500 mb-8">Enter your details to access your Omni AI dashboard.</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-900">Password</label>
                  <a href="#" className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200"
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

            <p className="mt-8 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                Sign up
              </Link>
            </p>

            <div className="mt-10">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or use demo accounts</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.type}
                    type="button"
                    onClick={() => handleDemoSelect(demo.email)}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-purple-200 hover:shadow-sm transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-2 rounded-lg bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                      {demo.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{demo.type}</p>
                      <p className="text-[10px] text-gray-500 truncate">{demo.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-purple-50">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 z-0" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0" />
        
        <div className="absolute bottom-16 left-16 right-16 z-20 bg-white/60 backdrop-blur-xl p-8 rounded-2xl border border-white shadow-xl">
          <blockquote className="text-xl font-medium text-gray-900 leading-relaxed mb-4">
            "Omni AI transformed our cabinet operations completely. The anomaly detection caught issues we would have missed, saving thousands."
          </blockquote>
          <div className="flex items-center gap-4">
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop" alt="Sarah J." className="w-12 h-12 rounded-full border-2 border-purple-500" />
            <div>
              <p className="font-semibold text-gray-900">Sarah Jenkins</p>
              <p className="text-sm text-gray-600">Lead Partner, Financial Cabinet</p>
            </div>
          </div>
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