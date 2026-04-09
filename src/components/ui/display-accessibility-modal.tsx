import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sun, Moon, Palette } from "lucide-react";

interface DisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DisplayAccessibilityModal({ isOpen, onClose }: DisplayModalProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');

  useEffect(() => {
    // Get current theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    }
  }, [isOpen]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Apply theme to document
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else if (newTheme === 'light') {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    } else {
      // Auto: follow system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            Display & Accessibility
          </DialogTitle>
          <DialogDescription>
            Choose how Omni AI looks and feels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Light Theme */}
          <button
            onClick={() => handleThemeChange('light')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex-shrink-0">
              <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-purple-600' : 'text-yellow-500'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${theme === 'light' ? 'text-purple-900' : 'text-gray-900'}`}>
                Light
              </p>
              <p className="text-sm text-gray-500">Bright and clean theme</p>
            </div>
            {theme === 'light' && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex-shrink-0">
              <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-600' : 'text-slate-600'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${theme === 'dark' ? 'text-purple-900' : 'text-gray-900'}`}>
                Dark
              </p>
              <p className="text-sm text-gray-500">Easy on the eyes</p>
            </div>
            {theme === 'dark' && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>

          {/* Auto Theme */}
          <button
            onClick={() => handleThemeChange('auto')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              theme === 'auto'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex-shrink-0">
              <Palette className={`w-6 h-6 ${theme === 'auto' ? 'text-purple-600' : 'text-indigo-500'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${theme === 'auto' ? 'text-purple-900' : 'text-gray-900'}`}>
                Auto
              </p>
              <p className="text-sm text-gray-500">Follow system preference</p>
            </div>
            {theme === 'auto' && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          ✅ Theme saved automatically
        </div>
      </DialogContent>
    </Dialog>
  );
}
