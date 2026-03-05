import React from 'react';
import { Home } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SERVICES } from '../services';
import type { View } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Sidebar = ({
  currentView,
  setView,
  onOpenTab,
}: {
  currentView: View;
  setView: (v: View) => void;
  onOpenTab: (v: View) => void;
}) => {
  return (
    <div className="w-64 bg-[#1a1c1e] text-white h-screen flex flex-col border-r border-white/10">
      <div className="p-6 border-bottom border-white/5">
        <h1 className="text-2xl font-bold tracking-tighter text-white">NAMI</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Business Suite</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <button
          onClick={() => setView('home')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
            currentView === 'home'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          )}
        >
          <Home
            size={18}
            className={cn(
              currentView === 'home' ? 'text-white' : 'text-gray-500 group-hover:text-white'
            )}
          />
          <span className="font-medium">Home</span>
        </button>

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Services</p>
        </div>

        {SERVICES.map((service) => {
          const Icon = service.icon;
          const isActive =
            currentView === service.id ||
            (service.id === 'estimation' && currentView === 'estimation-detail');
          return (
            <button
              key={service.id}
              onClick={() => onOpenTab(service.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                size={18}
                className={cn(
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'
                )}
              />
              <span className="font-medium">{service.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-[10px] text-gray-500 truncate">admin@nami.co.kr</p>
          </div>
        </div>
      </div>
    </div>
  );
};
