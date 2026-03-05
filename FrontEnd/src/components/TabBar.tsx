import React from 'react';
import { Plus, FileText } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SERVICES } from '../services';
import type { View } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TabBar = ({
  tabs,
  activeTab,
  onSwitch,
  onClose,
}: {
  tabs: View[];
  activeTab: View;
  onSwitch: (v: View) => void;
  onClose: (v: View) => void;
}) => {
  if (tabs.length === 0) return null;

  const getLabel = (v: View) => {
    const service = SERVICES.find((s) => s.id === v);
    if (service) return service.label;
    if (v === 'estimation-detail') return '견적 상세';
    return '';
  };

  const getIcon = (v: View) => {
    const service = SERVICES.find((s) => s.id === v);
    if (service) {
      const Icon = service.icon;
      return <Icon size={14} />;
    }
    if (v === 'estimation-detail') return <FileText size={14} />;
    return null;
  };

  return (
    <div className="bg-white border-b border-gray-100 px-8 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <div
          key={tab}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
            activeTab === tab
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
          )}
          onClick={() => onSwitch(tab)}
        >
          {getIcon(tab)}
          <span>{getLabel(tab)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab);
            }}
            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
          >
            <Plus className="rotate-45" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
