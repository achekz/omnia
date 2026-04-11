import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { User, Mail, Building, Briefcase, Camera, Shield, Bell, Key, Globe, Lock, Check } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [isPublic, setIsPublic] = useState(user?.isPublic || false);
  
  // Profile states
  const [fullName, setFullName] = useState(user?.name || '');
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    inAppMentions: true,
    taskUpdates: true,
    aiInsights: true,
    marketingUpdates: false
  });
  
  // Password states
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  // Success messages
  const [successMessages, setSuccessMessages] = useState({
    profile: false,
    email: false,
    notifications: false,
    password: false
  });

  if (!user) return null;

  // Hide success messages after 3 seconds
  const showSuccess = (key) => {
    setSuccessMessages(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setSuccessMessages(prev => ({ ...prev, [key]: false }));
    }, 3000);
  };

  // Handle Profile Save
  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          isPublic
        })
      });

      if (response.ok) {
        showSuccess('profile');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  // Handle Send Email Verification Code
  const handleSendEmailCode = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    setLoadingEmail(true);
    try {
      const response = await fetch('/api/users/send-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail })
      });

      if (response.ok) {
        setEmailSent(true);
        setShowEmailVerification(true);
        alert('Verification code sent to your email');
      } else {
        alert('Failed to send verification code');
      }
    } catch (error) {
      alert('Failed to send verification code');
    } finally {
      setLoadingEmail(false);
    }
  };

  // Handle Verify Email Code
  const handleVerifyEmailCode = async () => {
    if (!emailVerificationCode) {
      alert('Please enter the verification code');
      return;
    }

    try {
      const response = await fetch('/api/users/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newEmail,
          code: emailVerificationCode 
        })
      });

      if (response.ok) {
        showSuccess('email');
        alert('Email updated successfully. Please log in again.');
        logout();
        setTimeout(() => setLocation('/login'), 1000);
        setShowChangeEmail(false);
        setShowEmailVerification(false);
        setNewEmail('');
        setEmailVerificationCode('');
      } else {
        alert('Invalid verification code');
      }
    } catch (error) {
      alert('Failed to verify email');
    }
  };

  // Handle Notification Save
  const handleSaveNotifications = async () => {
    try {
      const response = await fetch('/api/users/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications)
      });

      if (response.ok) {
        showSuccess('notifications');
      } else {
        alert('Failed to update preferences');
      }
    } catch (error) {
      alert('Failed to update preferences');
    }
  };

  // Handle Password Change
  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      alert('Please fill all password fields');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });

      if (response.ok) {
        showSuccess('password');
        alert('Password updated successfully');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        alert('Failed to change password');
      }
    } catch (error) {
      alert('Failed to change password');
    }
  };

  const notificationsList = [
    { key: 'emailNotifications', title: "Email Notifications", desc: "Receive summary reports and important alerts via email" },
    { key: 'inAppMentions', title: "In-App Mentions", desc: "Get notified when someone mentions you in a task" },
    { key: 'taskUpdates', title: "Task Updates", desc: "Alerts when the status of your tasks change" },
    { key: 'aiInsights', title: "AI Insights", desc: "Proactive recommendations and anomaly detection alerts" },
    { key: 'marketingUpdates', title: "Marketing Updates", desc: "Receive news about new features and promotions" },
  ];

  return (
    <ModuleLayout activeItem="settings">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col md:flex-row">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 p-4">
            <div className="px-4 py-3 mb-4 bg-gray-900 dark:bg-gray-950 rounded-xl border border-gray-700 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Settings</p>
            </div>
            <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'profile' ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm border border-gray-200/50 dark:border-gray-600/50' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <User className="w-4 h-4" /> Personal Info
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'security' ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm border border-gray-200/50 dark:border-gray-600/50' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Shield className="w-4 h-4" /> Security
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'notifications' ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm border border-gray-200/50 dark:border-gray-600/50' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Bell className="w-4 h-4" /> Notifications
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 sm:p-8">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {successMessages.profile && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">Profile updated successfully!</p>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer">
                    <img 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7C3AED&color=fff&size=80`} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-2xl object-cover border border-gray-200 transition-all group-hover:brightness-75"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                    <div className="mt-2 flex gap-2">
                      <button className="text-sm text-purple-600 font-medium hover:text-purple-700">Upload New</button>
                      <button className="text-sm text-gray-400 font-medium hover:text-rose-500">Remove</button>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input 
                        type="email" 
                        value={user.email} 
                        disabled 
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed" 
                      />
                    </div>
                    <button 
                      onClick={() => setShowChangeEmail(!showChangeEmail)}
                      className="text-sm text-purple-600 font-medium hover:text-purple-700"
                    >
                      {showChangeEmail ? 'Cancel' : 'Change Email'}
                    </button>
                  </div>
                </div>

                {showChangeEmail && (
                  <div className="space-y-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
                    {!showEmailVerification ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">New Email Address</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                              <Mail className="w-4 h-4" />
                            </div>
                            <input 
                              type="email" 
                              placeholder="Enter your new email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" 
                            />
                          </div>
                        </div>
                        <button 
                          onClick={handleSendEmailCode}
                          disabled={loadingEmail}
                          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                        >
                          {loadingEmail ? 'Sending...' : 'Send Verification Code'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Verification Code</label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">We sent a code to {newEmail}</p>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                              <Key className="w-4 h-4" />
                            </div>
                            <input 
                              type="text" 
                              placeholder="Enter 6-digit code"
                              value={emailVerificationCode}
                              onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none text-center tracking-widest" 
                            />
                          </div>
                        </div>
                        <button 
                          onClick={handleVerifyEmailCode}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                        >
                          Verify & Update Email
                        </button>
                      </>
                    )}
                  </div>
                )}

                <hr className="border-gray-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input type="text" value={user.role} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed capitalize" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Profile Type</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <Building className="w-4 h-4" />
                      </div>
                      <input type="text" value={user.profileType} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed capitalize" />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                  <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {isPublic ? <Globe className="w-5 h-5 text-blue-600" /> : <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                    Account Visibility
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Control who can view your profile and information</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        !isPublic 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Lock className={`w-5 h-5 ${!isPublic ? 'text-purple-600' : 'text-gray-400 dark:text-gray-600'}`} />
                        <div>
                          <p className={`font-semibold text-sm ${!isPublic ? 'text-purple-900' : 'text-gray-900'}`}>Private</p>
                          <p className="text-xs text-gray-500 mt-0.5">Only you can see your profile</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isPublic 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className={`w-5 h-5 ${isPublic ? 'text-purple-600' : 'text-gray-400 dark:text-gray-600'}`} />
                        <div>
                          <p className={`font-semibold text-sm ${isPublic ? 'text-purple-900' : 'text-gray-900'}`}>Public</p>
                          <p className="text-xs text-gray-500 mt-0.5">Your profile is visible to everyone</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {successMessages.password && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">Password updated successfully!</p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your password to keep your account secure.</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.current}
                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" 
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleChangePassword}
                    className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {successMessages.notifications && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">Notification preferences saved!</p>
                  </div>
                )}

                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose what alerts you want to receive.</p>
                </div>

                <div className="space-y-4">
                  {notificationsList.map((pref) => (
                    <div key={pref.key} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-colors">
                      <div className="h-5 flex items-center mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={notifications[pref.key]}
                          onChange={(e) => setNotifications({...notifications, [pref.key]: e.target.checked})}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{pref.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{pref.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveNotifications}
                    className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-500/20"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
