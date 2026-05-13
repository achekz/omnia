// Role du fichier: fournit un composant UI reutilisable.
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const [pathname, setLocation] = useLocation();

  if (pathname === "/" || pathname === "" || pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <button
      onClick={() => setLocation("/")}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors duration-200 group"
      title="Retour à l'accueil"
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}
