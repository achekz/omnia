import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { Users, FileText, CircleDollarSign, Calculator, CalendarClock, Timer, ShieldAlert, GraduationCap, ArrowRight, UserMinus } from "lucide-react";

export default function EmployesRedesign() {
  const { user } = useAuth();

  if (!user || user.profileType !== 'company') {
    return (
      <ModuleLayout activeItem="employes">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Access Restricted</div>
      </ModuleLayout>
    );
  }

  const cards = [
    {
      title: "Employés",
      desc: "Gérer les informations des employés",
      icon: <Users className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Contrats",
      desc: "Gérer les contrats de travail",
      icon: <FileText className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Salaires & Avantages",
      desc: "Historique des rémunérations et avantages",
      icon: <CircleDollarSign className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Coût Structure",
      desc: "Gérer les CJM/TJM par profil",
      icon: <Calculator className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Congés",
      desc: "Gérer les demandes de congés",
      icon: <CalendarClock className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Pointage",
      desc: "Pointer et suivre le temps de présence",
      icon: <Timer className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Santé & Sécurité",
      desc: "Gérer la santé et sécurité au travail",
      icon: <ShieldAlert className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Formations",
      desc: "Gérer les formations et développement",
      icon: <GraduationCap className="w-6 h-6 text-orange-600" />
    },
    {
      title: "Offboarding",
      desc: "Gérer les départs d'employés",
      icon: <UserMinus className="w-6 h-6 text-orange-600" />
    }
  ];

  return (
    <ModuleLayout activeItem="employes">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto overflow-hidden">
        
        {/* Header Block */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
            <Users className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 leading-tight">Employés</h1>
            <p className="text-gray-500 text-lg">Gérer les informations des employés</p>
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-gray-900 rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-orange-100 dark:hover:border-orange-800 transition-all cursor-pointer group relative overflow-hidden flex flex-col min-h-[180px]"
            >
              {/* Decorative Circle matching screenshot */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-50 rounded-full transition-transform group-hover:scale-150 group-hover:bg-orange-100/50" />
              
              <div className="flex items-start gap-4 mb-2 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  {/* The screenshot shows white icons on orange background */}
                  <div className="text-white w-6 h-6 flex items-center justify-center">
                    {/* React.cloneElement to make the icon white */}
                    {React.cloneElement(card.icon as React.ReactElement, { className: 'w-6 h-6 text-white' })}
                  </div>
                </div>
                <div className="pt-2 flex-1">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-orange-600 transition-colors flex items-center justify-between">
                    {card.title}
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                  </h3>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-2 flex-1 relative z-10 leading-relaxed pr-8">
                {card.desc}
              </p>

              <div className="mt-4 pt-4 border-t border-gray-50 relative z-10 flex items-center gap-2 text-xs font-bold text-gray-500 group-hover:text-orange-600 transition-colors uppercase tracking-wider">
                <ArrowRight className="w-3.5 h-3.5" />
                Accéder au {card.title}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </ModuleLayout>
  );
}

// Ensure React is imported to use cloneElement
import React from "react";
