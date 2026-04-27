import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Globe,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      title: "Machine Learning Prédictif",
      desc: "Anticipez vos ventes et détectez les anomalies financières avant qu'elles n'arrivent.",
      icon: <Zap className="w-6 h-6 text-white" />,
    },
    {
      title: "Gestion Complète",
      desc: "De la comptabilité aux ressources humaines, gérez toutes les facettes de votre entreprise.",
      icon: <BarChart3 className="w-6 h-6 text-white" />,
    },
    {
      title: "Sécurité & Conformité",
      desc: "Vos données sont cryptées et hébergées selon les normes de sécurité les plus strictes.",
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
    },
    {
      title: "Collaboration en Temps Réel",
      desc: "Invitez votre équipe, vos experts-comptables ou vos partenaires sur une seule plateforme.",
      icon: <Users className="w-6 h-6 text-white" />,
    },
    {
      title: "Déploiement Mondial",
      desc: "Gérez plusieurs devises, langues et filiales dans différents pays avec facilité.",
      icon: <Globe className="w-6 h-6 text-white" />,
    },
    {
      title: "Insights Automatisés",
      desc: "Recevez des recommandations hebdomadaires basées sur les performances de votre activité.",
      icon: <Star className="w-6 h-6 text-white" />,
    },
  ];

  const profiles = [
    {
      title: "Entreprises",
      desc: "Pilotez vos opérations, suivez la trésorerie et gérez votre équipe efficacement.",
      icon: <Building2 className="w-8 h-8 text-purple-600" />,
    },
    {
      title: "Cabinets",
      desc: "Supervisez tous vos clients, détectez les anomalies et gagnez du temps sur la saisie.",
      icon: <BriefcaseIcon className="w-8 h-8 text-pink-600" />,
    },
    {
      title: "Employés",
      desc: "Accédez à vos fiches de paie, posez vos congés et gérez vos tâches quotidiennes.",
      icon: <Users className="w-8 h-8 text-purple-600" />,
    },
    {
      title: "Étudiants",
      desc: "Suivez votre budget, vos candidatures et organisez votre emploi du temps.",
      icon: <BookOpen className="w-8 h-8 text-pink-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-purple-200">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight gradient-text">Omni AI</span>
            </div>

            <div className="flex items-center gap-6">
              <a href="/register" className="hidden md:block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors">Créer un compte</a>
              <a href="/login" className="gradient-bg rounded-full px-6 py-2.5 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5">
                Se connecter
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 -z-10" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-200/40 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pink-200/40 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/3 -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-gray-900 mb-6">Tout votre business.</h1>
            <div className="gradient-bg text-white rounded-full px-8 py-3 inline-block text-3xl md:text-4xl font-bold mb-8 shadow-xl shadow-purple-500/20 transform -rotate-2">
              Une seule plateforme.
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a href="/register" className="cta-breathe gradient-bg rounded-full px-8 py-4 text-white text-lg font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-purple-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Pour tous les profils</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Une interface adaptée à vos besoins spécifiques, que vous soyez un grand groupe ou un étudiant.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {profiles.map((profile, index) => (
              <motion.div
                key={profile.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">{profile.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{profile.title}</h3>
                <p className="text-gray-600 leading-relaxed">{profile.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Fonctionnalités puissantes</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Tout ce dont vous avez besoin pour faire passer votre gestion au niveau supérieur.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">Prêt à transformer votre gestion ?</h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">Rejoignez des milliers d&apos;entreprises qui font confiance à Omni AI pour piloter leur croissance.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/register" className="bg-white text-purple-600 rounded-full px-8 py-4 text-lg font-bold hover:shadow-xl transition-all hover:-translate-y-1 text-center">
              Créer un compte gratuit
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 pt-16 pb-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold text-2xl tracking-tight text-white">Omni AI</span>
              </div>
              <p className="text-gray-400 leading-relaxed">La plateforme de gestion tout-en-un propulsée par l&apos;intelligence artificielle.</p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Produits</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">ERP Complet</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">CRM Intelligent</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Comptabilité</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Ressources Humaines</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Ressources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API & Webhooks</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Centre d&apos;aide</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Entreprise</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Carrières</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Confidentialité</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-center flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Omni AI. Tous droits réservés.</p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-all">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-all">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BriefcaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
