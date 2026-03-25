import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  Banknote, 
  TrendingUp, 
  FileText, 
  Calculator, 
  Calendar,
  Wallet,
  PieChart,
  ArrowRight,
  Info
} from "lucide-react";

export default function PaieTunisieDashboard() {
  const { user } = useAuth();

  if (!user || (user.profileType !== 'company' && user.profileType !== 'cabinet')) {
    return (
      <ModuleLayout activeItem="dashboard">
        <div className="p-8 text-center text-gray-500">Access Restricted</div>
      </ModuleLayout>
    );
  }

  const stats = [
    { label: "Salariés actifs", value: "8", icon: <Users className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Masse brute", value: "48,500", icon: <Wallet className="w-5 h-5" />, color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: "Net à payer", value: "36,200", icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "IRPP", value: "8,450", icon: <Banknote className="w-5 h-5" />, color: "text-rose-500", bg: "bg-rose-50" },
    { label: "CNSS salariale", value: "3,200", icon: <FileText className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "CSS", value: "650", icon: <CircleDollarSign className="w-5 h-5" />, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Salaire moyen brut", value: "6,062", icon: <Calculator className="w-5 h-5" />, color: "text-teal-500", bg: "bg-teal-50" },
    { label: "CNSS patronale", value: "7,800", icon: <PieChart className="w-5 h-5" />, color: "text-violet-500", bg: "bg-violet-50" },
    { label: "Primes", value: "4,500", icon: <TrendingUp className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Indemnités", value: "1,200", icon: <Banknote className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Avantages nature", value: "2,100", icon: <FileText className="w-5 h-5" />, color: "text-rose-500", bg: "bg-rose-50" },
    { label: "Coût total", value: "56,300", icon: <Calculator className="w-5 h-5" />, color: "text-slate-500", bg: "bg-slate-100" },
  ];

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="p-8 max-w-[1600px] mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Paie Tunisie</h1>
          <p className="text-gray-500 mt-1">Tableau de bord - Vue d'ensemble de la paie</p>
        </div>

        {/* Filters bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-8 flex flex-wrap items-center gap-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold">
            <Calendar className="w-4 h-4" /> Periode
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md shadow-sm">Année</button>
            <button className="px-4 py-1.5 text-gray-600 text-xs font-bold hover:bg-gray-200 rounded-md transition-colors">Trimestre</button>
            <button className="px-4 py-1.5 text-gray-600 text-xs font-bold hover:bg-gray-200 rounded-md transition-colors">Mois</button>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700">
             <Calendar className="w-4 h-4" /> 2026
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter truncate">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] text-gray-400 font-bold">TND</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
               <Timer className="w-5 h-5 text-gray-400" />
               <h3 className="font-bold text-gray-900 text-lg">Salariés par type de contrat</h3>
            </div>
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
               <div className="w-16 h-16 rounded-full border-4 border-gray-50 mb-4 animate-pulse" />
               <p className="font-medium">Aucun salarié actif pour cette période</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
               <ShieldAlert className="w-5 h-5 text-gray-400" />
               <h3 className="font-bold text-gray-900 text-lg">Cotisations et retenues - 2026</h3>
            </div>
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
               <div className="w-16 h-16 rounded-full border-4 border-gray-50 mb-4 animate-pulse" />
               <p className="font-medium">Aucune donnée disponible</p>
            </div>
          </div>
        </div>

        {/* Action Banner */}
        <div className="mt-8 bg-blue-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Info className="w-6 h-6 text-white" />
             </div>
             <div>
                <h4 className="font-bold text-lg">Générer les bulletins de paie</h4>
                <p className="text-blue-100">Prêt pour la clôture du mois de Mars 2026</p>
             </div>
          </div>
          <button className="px-6 py-2.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2">
            Lancer le calcul <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </ModuleLayout>
  );
}

function CircleDollarSign(props: any) {
  return <Banknote className={props.className} />;
}
function ShieldAlert(props: any) {
  return <Info className={props.className} />;
}
function Timer(props: any) {
  return <Calendar className={props.className} />;
}
