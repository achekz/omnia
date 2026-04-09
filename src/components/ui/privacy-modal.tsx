import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lock, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<boolean | null>(null);

  useEffect(() => {
    // Get current privacy setting from localStorage
    const saved = localStorage.getItem('accountPrivacy');
    if (saved) {
      setIsPrivate(saved === 'private');
    }
  }, [isOpen]);

  const handlePrivacyChange = (newIsPrivate: boolean) => {
    setPendingChoice(newIsPrivate);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (pendingChoice !== null) {
      setIsPrivate(pendingChoice);
      localStorage.setItem('accountPrivacy', pendingChoice ? 'private' : 'public');
      setShowConfirmation(false);
      setPendingChoice(null);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingChoice(null);
  };

  if (showConfirmation && pendingChoice !== null) {
    return (
      <Dialog open={isOpen && showConfirmation} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Confirm Privacy Change
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {pendingChoice ? (
              <>
                <p className="text-gray-700">
                  <strong>Make your account private?</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Only people you approve can see your profile, posts, and activity. You'll need to approve follow requests.
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-700">
                  <strong>Make your account public?</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Anyone can see your profile, posts, and activity. No approval needed to follow you.
                </p>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleConfirm}
            >
              {pendingChoice ? "Make Private" : "Make Public"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen && !showConfirmation} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            Privacy Settings
          </DialogTitle>
          <DialogDescription>
            Control who can see your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Public Account */}
          <button
            onClick={() => handlePrivacyChange(false)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              !isPrivate
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex-shrink-0">
              <Globe className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${!isPrivate ? 'text-purple-900' : 'text-gray-900'}`}>
                Public Account
              </p>
              <p className="text-sm text-gray-500">Anyone can find and follow you</p>
            </div>
            {!isPrivate && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>

          {/* Private Account */}
          <button
            onClick={() => handlePrivacyChange(true)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              isPrivate
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex-shrink-0">
              <Lock className="w-6 h-6 text-rose-500" />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${isPrivate ? 'text-purple-900' : 'text-gray-900'}`}>
                Private Account
              </p>
              <p className="text-sm text-gray-500">Only approved followers can see your activity</p>
            </div>
            {isPrivate && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-600" />
            )}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          Current: <strong>{isPrivate ? "Private" : "Public"}</strong> account
        </div>
      </DialogContent>
    </Dialog>
  );
}
