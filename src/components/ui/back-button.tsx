import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export function BackButton() {
  const [pathname] = useLocation();
  const [, setLocation] = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if we can go back
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleGoBack = () => {
    window.history.back();
  };

  // Don't show back button on landing/home page or dashboard pages
  if (pathname === "/" || pathname === "" || pathname.startsWith("/dashboard")) return null;

  if (!canGoBack) return null;

  return (
    <button
      onClick={handleGoBack}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors duration-200 group"
      title="Go back"
    >
      <ArrowLeft className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
