import React from 'react';
import { Home, BookOpen, Search, ChevronRight } from 'lucide-react';

export const TopBar = ({ onGoHome }: { onGoHome: () => void }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Home size={18} />
          <span className="text-sm font-medium">Home</span>
        </button>
        <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors">
          <BookOpen size={18} />
          <span className="text-sm font-medium">사용 매뉴얼</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 relative">
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          <ChevronRight className="rotate-90" size={20} />
        </button>
      </div>
    </header>
  );
};
