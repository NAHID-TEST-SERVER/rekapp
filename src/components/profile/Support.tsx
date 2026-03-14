import React from 'react';
import { Phone, MessageSquare } from 'lucide-react';

export default function Support() {
  const contacts = [
    { name: 'অ্যাডমিন', number: '01715836897' },
    { name: 'ডেভেলপার', number: '01328276240' }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">সাপোর্ট</h3>
      {contacts.map((contact, i) => (
        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">{contact.name}</p>
            <p className="text-xs text-gray-500">{contact.number}</p>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${contact.number}`} className="p-3 bg-primary/10 text-primary rounded-full">
              <Phone className="w-5 h-5" />
            </a>
            <a href={`https://wa.me/${contact.number.replace(/^0/, '880')}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-green-500/10 text-green-600 rounded-full">
              <MessageSquare className="w-5 h-5" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
