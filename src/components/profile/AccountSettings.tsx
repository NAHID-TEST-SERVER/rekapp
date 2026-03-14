import React from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';

export default function AccountSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">অ্যাকাউন্ট সেটিংস</h3>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium">পুশ নোটিফিকেশন</span>
          </div>
          <input type="checkbox" className="toggle" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium">ইমেইল নোটিফিকেশন</span>
          </div>
          <input type="checkbox" className="toggle" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium">এসএমএস নোটিফিকেশন</span>
          </div>
          <input type="checkbox" className="toggle" defaultChecked />
        </div>
      </div>
    </div>
  );
}
