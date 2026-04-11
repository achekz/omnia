import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface DisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DisplayAccessibilityModal({ isOpen, onClose }: DisplayModalProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Display & Accessibility
          </DialogTitle>
          <DialogDescription>
            Choose how Omni AI looks and feels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Light Theme */}
          <button
            onClick={() => setTheme('light')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex-shrink-0">
              <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-purple-600' : 'text-yellow-500'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${theme === 'light' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'}`}>
                Light
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bright and clean theme</p>
            </div>
            {theme === 'light' && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => setTheme('dark')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex-shrink-0">
              <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-600' : 'text-slate-600'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${theme === 'dark' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'}`}>
                Dark
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Easy on the eyes</p>
            </div>
            {theme === 'dark' && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
