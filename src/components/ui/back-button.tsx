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
      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200 group"
      title="Retour à l'accueil"
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}
