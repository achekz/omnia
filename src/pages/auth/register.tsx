import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Building2, ArrowRight, Loader2, Briefcase, GraduationCap, Users2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type ProfileType = 'company' | 'cabinet' | 'employee' | 'student';

export default function Register() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [profileType, setProfileType] = useState<ProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const profileOptions: { id: ProfileType; label: string; icon: any; desc: string }[] = [
    { id: 'company', label: 'Company Admin', icon: <Building2 className="w-6 h-6" />, desc: 'Manage your entire team and operations' },
    { id: 'cabinet', label: 'Cabinet Admin', icon: <Briefcase className="w-6 h-6" />, desc: 'Manage client financials and compliance' },
    { id: 'employee', label: 'Employee', icon: <Users2 className="w-6 h-6" />, desc: 'Join an existing workspace' },
    { id: 'student', label: 'Student', icon: <GraduationCap className="w-6 h-6" />, desc: 'Manage studies and personal budget' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileType) {
      setError("Please select a profile type");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        profileType,
        orgName: formData.organizationName
      });
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      
      <div className="max-w-3xl w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">Create your account</h2>
          <p className="text-lg text-muted-foreground">Join Omni AI and transform your workflow today.</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Profile Type */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">1. Select your role</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setProfileType(opt.id)}
                    className={cn(
                      "flex items-start gap-4 p-5 rounded-2xl border transition-all text-left",
                      profileType === opt.id 
                        ? "bg-primary/10 border-primary shadow-lg shadow-primary/10 glow-shadow" 
                        : "bg-card border-white/5 hover:border-white/20 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-xl",
                      profileType === opt.id ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"
                    )}>
                      {opt.icon}
                    </div>
                    <div>
                      <h4 className={cn("font-semibold mb-1", profileType === opt.id ? "text-white" : "text-foreground")}>{opt.label}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Details */}
            <motion.div 
              initial={false}
              animate={{ opacity: profileType ? 1 : 0.5, pointerEvents: profileType ? 'auto' : 'none' }}
              className="space-y-5 pt-6 border-t border-white/5"
            >
              <h3 className="text-lg font-semibold text-white mb-4">2. Account details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {(profileType === 'company' || profileType === 'cabinet') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-foreground mb-2">Organization Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.organizationName}
                      onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      placeholder="Acme Corp"
                    />
                  </div>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-background border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !profileType}
                className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-primary to-primary/80 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Create Account <ArrowRight className="ml-2 w-5 h-5" /></>}
              </button>
            </motion.div>
          </form>
        </div>
        
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-white hover:text-primary transition-colors">
            Log in here
          </Link>
        </p>
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
