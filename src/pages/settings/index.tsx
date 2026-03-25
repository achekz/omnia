import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Building, Briefcase, Camera, Shield, Bell, Key } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) return null;

  return (
    <ModuleLayout activeItem="settings">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-gray-900">Settings</h2>
          <p className="text-gray-500 mt-1">Manage your account preferences and personal information.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4">
            <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'profile' ? 'bg-white text-purple-700 shadow-sm border border-gray-200/50' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4" /> Personal Info
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'security' ? 'bg-white text-purple-700 shadow-sm border border-gray-200/50' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-4 h-4" /> Security
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'notifications' ? 'bg-white text-purple-700 shadow-sm border border-gray-200/50' : 'text-gray-600 hover:bg-gray-100'
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
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input type="text" defaultValue={user.name} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input type="email" defaultValue={user.email} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input type="text" defaultValue={user.role} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed capitalize" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Profile Type</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input type="text" defaultValue={user.profileType} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed capitalize" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-500/20">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-500">Update your password to keep your account secure.</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <button className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                  <p className="text-sm text-gray-500">Choose what alerts you want to receive.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { title: "Email Notifications", desc: "Receive summary reports and important alerts via email", checked: true },
                    { title: "In-App Mentions", desc: "Get notified when someone mentions you in a task", checked: true },
                    { title: "Task Updates", desc: "Alerts when the status of your tasks change", checked: true },
                    { title: "AI Insights", desc: "Proactive recommendations and anomaly detection alerts", checked: true },
                    { title: "Marketing Updates", desc: "Receive news about new features and promotions", checked: false },
                  ].map((pref, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-colors">
                      <div className="h-5 flex items-center mt-0.5">
                        <input type="checkbox" defaultChecked={pref.checked} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{pref.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{pref.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-500/20">
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
