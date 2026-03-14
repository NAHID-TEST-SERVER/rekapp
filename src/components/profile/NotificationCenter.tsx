import React from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { formatDate } from '../../utils';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function NotificationCenter({ userData, notifications = [] }: { userData: any, notifications?: any[] }) {
  
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">নোটিফিকেশন</h3>
      
      {notifications.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">কোনো নোটিফিকেশন নেই</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`bg-white p-4 rounded-2xl shadow-sm border transition-colors cursor-pointer flex items-start gap-4 ${n.isRead ? 'border-gray-100 opacity-70' : 'border-primary/30 bg-primary/5'}`}
            >
              <div className={`p-3 rounded-full shrink-0 ${n.isRead ? 'bg-gray-100' : 'bg-primary/10'}`}>
                <Bell className={`w-5 h-5 ${n.isRead ? 'text-gray-400' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <p className={`font-bold text-sm ${n.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                  {n.isRead && <CheckCircle className="w-3 h-3 text-green-500 shrink-0 mt-1" />}
                </div>
                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${n.isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-2">{formatDate(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
