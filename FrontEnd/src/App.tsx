/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  FileText,
  Home,
  BookOpen,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Filter,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type View = 'home' | 'mail-summary' | 'estimation' | 'estimation-detail';

interface BidData {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  no: string;
  item: string;
  spec: string;
  unit: string;
  quantity: number;
  materialCost: number;
  laborCost: number;
  expense: number;
  result: '낙찰' | '탈락';
}

// --- Mock Data ---

const INITIAL_BID_DATA: BidData[] = [
  {
    id: '1',
    projectId: 'P1',
    projectName: '포웰시티',
    date: '2024-03-25',
    no: '1',
    item: '이동식들비계',
    spec: 'H=1.8m, 1단',
    unit: 'EA',
    quantity: 10,
    materialCost: 45000,
    laborCost: 12000,
    expense: 5000,
    result: '낙찰',
  },
  {
    id: '2',
    projectId: 'P1',
    projectName: '포웰시티',
    date: '2024-03-25',
    no: '1-1',
    item: '강관비계',
    spec: '외부비계 가설',
    unit: 'M2',
    quantity: 150,
    materialCost: 3200,
    laborCost: 5500,
    expense: 400,
    result: '낙찰',
  },
  {
    id: '3',
    projectId: 'P2',
    projectName: '푸르지오',
    date: '2024-03-20',
    no: '1',
    item: '도장마감',
    spec: '친환경 수성페인트 2회',
    unit: 'M2',
    quantity: 300,
    materialCost: 8500,
    laborCost: 15000,
    expense: 1200,
    result: '탈락',
  },
  {
    id: '4',
    projectId: 'P3',
    projectName: '자이 아파트',
    date: '2024-04-01',
    no: '1',
    item: '이동식들비계',
    spec: 'H=1.8m, 1단',
    unit: 'EA',
    quantity: 5,
    materialCost: 46000,
    laborCost: 12500,
    expense: 5200,
    result: '탈락',
  },
];

interface Email {
  id: number;
  folder: string;
  subject: string;
  sender: string;
  received_at: string;
  is_after_hours: boolean;
  body: string;
}

interface MailSummaryState {
  date: string;
  folderFilter: string;
  folders: string[];
  isLoadingEmails: boolean;
  isSummarizing: boolean;
  summary: string | null;
  emails: Email[];
  selectedEmail: Email | null;
  emailSearch: string;
}

// --- Components ---

const Sidebar = ({ currentView, setView, openTabs: _openTabs, onOpenTab }: {
  currentView: View,
  setView: (v: View) => void,
  openTabs: View[],
  onOpenTab: (v: View) => void
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
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
            currentView === 'home' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <Home size={18} className={cn(currentView === 'home' ? "text-white" : "text-gray-500 group-hover:text-white")} />
          <span className="font-medium">Home</span>
        </button>

        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Services</p>
        </div>

        <button 
          onClick={() => onOpenTab('mail-summary')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
            currentView === 'mail-summary' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <Mail size={18} className={cn(currentView === 'mail-summary' ? "text-white" : "text-gray-500 group-hover:text-white")} />
          <span className="font-medium">메일 요약</span>
        </button>
        
        <button 
          onClick={() => onOpenTab('estimation')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
            currentView === 'estimation' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <FileText size={18} className={cn(currentView === 'estimation' ? "text-white" : "text-gray-500 group-hover:text-white")} />
          <span className="font-medium">견적프로그램</span>
        </button>
      </nav>
      
      <div className="p-6 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">AD</div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-[10px] text-gray-500 truncate">admin@nami.co.kr</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TopBar = ({ onGoHome }: { onGoHome: () => void }) => {
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

const MailSummaryView = ({
  state,
  setState
}: {
  state: MailSummaryState,
  setState: React.Dispatch<React.SetStateAction<MailSummaryState>>
}) => {
  const updateState = (updates: Partial<MailSummaryState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // 폴더 목록 fetch (최초 1회)
  useEffect(() => {
    fetch('/api/folders')
      .then(res => res.json())
      .then(data => updateState({ folders: ['전체', ...(data.folders || [])] }))
      .catch(() => updateState({ folders: ['전체'] }));
  }, []);

  // 날짜 또는 폴더 필터 변경 시 메일 목록 fetch
  useEffect(() => {
    updateState({ isLoadingEmails: true, emails: [] });
    const params = new URLSearchParams();
    if (state.date) params.set('date', state.date);
    if (state.folderFilter && state.folderFilter !== '전체') params.set('folder', state.folderFilter);
    fetch(`/api/emails?${params.toString()}`)
      .then(res => res.json())
      .then(data => updateState({ emails: data.emails || [], isLoadingEmails: false }))
      .catch(() => updateState({ emails: [], isLoadingEmails: false }));
  }, [state.date, state.folderFilter]);

  const filteredEmails = useMemo(() => {
    const search = state.emailSearch.toLowerCase();
    return state.emails.filter(email =>
      email.sender.toLowerCase().includes(search) || email.subject.toLowerCase().includes(search)
    );
  }, [state.emails, state.emailSearch]);

  const handleTodaySummary = async () => {
    updateState({ isSummarizing: true, summary: null, selectedEmail: null });
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: state.date, type: '일별', folder: state.folderFilter }),
      });
      const data = await res.json();
      updateState({ summary: data.summary || '요약을 생성할 수 없습니다.' });
    } catch (error) {
      console.error(error);
      updateState({ summary: 'AI 요약 중 오류가 발생했습니다.' });
    } finally {
      updateState({ isSummarizing: false });
    }
  };

  const handleAfterWorkSummary = async () => {
    updateState({ isSummarizing: true, summary: null, selectedEmail: null });
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: state.date, type: '퇴근후', folder: state.folderFilter }),
      });
      const data = await res.json();
      updateState({ summary: data.summary || '요약을 생성할 수 없습니다.' });
    } catch (error) {
      console.error(error);
      updateState({ summary: 'AI 요약 중 오류가 발생했습니다.' });
    } finally {
      updateState({ isSummarizing: false });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">메일 요약 서비스</h2>
        <p className="text-gray-500 mt-2">메일 내용을 분석하여 AI가 학습할 수 있도록 준비하고 핵심 내용을 요약합니다.</p>
      </div>

      {/* Control Bar Section */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1 min-w-[300px]">
          <div className="flex items-center gap-3 text-blue-600 font-semibold shrink-0">
            <Calendar size={20} />
            <span className="text-sm">날짜 선택</span>
          </div>
          <input
            type="date"
            value={state.date}
            onChange={(e) => updateState({ date: e.target.value })}
            className="flex-1 max-w-[200px] p-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <div className="h-8 w-px bg-gray-100 mx-2 hidden md:block"></div>
          <button
            onClick={() => updateState({ date: new Date().toISOString().split('T')[0], folderFilter: '전체' })}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-sm font-medium"
            title="필터 초기화"
          >
            <Filter size={16} />
            <span>필터 초기화</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTodaySummary}
            disabled={state.isSummarizing}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 text-sm"
          >
            {state.isSummarizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>분석 중...</span>
              </>
            ) : (
              <>
                <Calendar size={18} />
                <span>당일 메일 요약</span>
              </>
            )}
          </button>

          <button
            onClick={handleAfterWorkSummary}
            disabled={state.isSummarizing}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
          >
            {state.isSummarizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>요약 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>퇴근 후 온 메일 요약</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Email List Panel */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Mail className="text-blue-500" size={20} />
              메일 목록
            </h3>
            <span className="text-xs text-gray-400 font-mono">{filteredEmails.length} Emails</span>
          </div>

          {/* 폴더(회사) 필터 드롭다운 */}
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-gray-400 shrink-0" />
            <select
              value={state.folderFilter}
              onChange={(e) => updateState({ folderFilter: e.target.value })}
              className="flex-1 p-2 bg-gray-50 border-none rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {state.folders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="보낸이 또는 제목 검색..."
              value={state.emailSearch}
              onChange={(e) => updateState({ emailSearch: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {state.isLoadingEmails ? (
              <div className="h-full flex items-center justify-center text-gray-400 gap-3">
                <div className="w-5 h-5 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">메일 불러오는 중...</span>
              </div>
            ) : filteredEmails.map(email => (
              <button
                key={email.id}
                onClick={() => updateState({ selectedEmail: email })}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all group border",
                  state.selectedEmail?.id === email.id
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-gray-50 border-transparent hover:bg-gray-100"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{email.sender}</span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{email.folder}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-400 font-mono">{email.received_at.replace('T', ' ').slice(0, 16)}</span>
                    {email.is_after_hours && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">퇴근후</span>
                    )}
                  </div>
                </div>
                <p className={cn(
                  "text-sm transition-colors line-clamp-1",
                  state.selectedEmail?.id === email.id ? "text-blue-700" : "text-gray-600 group-hover:text-blue-600"
                )}>
                  {email.subject}
                </p>
              </button>
            ))}
            {!state.isLoadingEmails && filteredEmails.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>

        {/* Summary Panel */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-blue-500" size={20} />
              AI 요약 결과
            </h3>
            <span className="text-xs text-gray-400 font-mono uppercase tracking-tighter">Generated by Gemini AI</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {state.isSummarizing ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">AI가 메일을 분석하고 있습니다...</p>
              </div>
            ) : state.summary ? (
              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed">
                <Markdown>{state.summary}</Markdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 border-2 border-dashed border-gray-100 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                  <Sparkles size={32} className="text-gray-200" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-500">요약 결과가 없습니다</p>
                  <p className="text-xs mt-1">상단의 요약 버튼을 눌러 분석을 시작해주세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Detail Overlay */}
      <AnimatePresence>
        {state.selectedEmail && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => updateState({ selectedEmail: null })}
          >
            <motion.div
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {state.selectedEmail.sender[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{state.selectedEmail.sender}</h4>
                    <p className="text-xs text-gray-500">{state.selectedEmail.received_at.replace('T', ' ').slice(0, 16)} 수신</p>
                  </div>
                </div>
                <button
                  onClick={() => updateState({ selectedEmail: null })}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Plus className="rotate-45 text-gray-400" size={20} />
                </button>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{state.selectedEmail.subject}</h3>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold">{state.selectedEmail.folder}</span>
                  {state.selectedEmail.is_after_hours && (
                    <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold">퇴근 후 수신</span>
                  )}
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {state.selectedEmail.body
                    ? <span className="text-gray-700">{state.selectedEmail.body}</span>
                    : <span className="text-gray-400 italic">본문 없음</span>
                  }
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => updateState({ selectedEmail: null })}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-all"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusBadge = ({ 
  value, 
  onChange 
}: { 
  value: BidData['result'], 
  onChange: (val: BidData['result']) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap",
          value === '낙찰' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"
        )}
      >
        {value}
        <ChevronRight size={10} className={cn("transition-transform", isOpen ? "rotate-90" : "")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-28 rounded-xl bg-white shadow-xl border border-gray-100 z-20 overflow-hidden">
            <button
              onClick={() => {
                onChange('낙찰');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              낙찰
            </button>
            <button
              onClick={() => {
                onChange('탈락');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-[10px] font-bold text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              탈락
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const EstimationProgramView = ({ 
  data, 
  setData, 
  onViewDetail 
}: { 
  data: BidData[], 
  setData: React.Dispatch<React.SetStateAction<BidData[]>>,
  onViewDetail: (projectId: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const sites = useMemo(() => {
    const uniqueSites = Array.from(new Set(data.map(d => d.projectName)));
    return ['전체', ...uniqueSites];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.item.includes(searchTerm) || item.spec.includes(searchTerm);
      const matchesSite = siteFilter === '전체' || item.projectName === siteFilter;
      return matchesSearch && matchesSite;
    });
  }, [data, searchTerm, siteFilter]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return { total: 0, winRate: 0, avgPrice: 0, recentBids: 0 };
    
    const winRate = (filteredData.filter(d => d.result === '낙찰').length / total) * 100;
    const avgPrice = filteredData.reduce((acc, curr) => acc + (curr.materialCost + curr.laborCost + curr.expense), 0) / total;
    
    // Calculate recent 30 days bids
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBids = filteredData.filter(d => new Date(d.date) >= thirtyDaysAgo).length;
    
    return { total, winRate, avgPrice, recentBids };
  }, [filteredData]);

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(d => d.id !== id));
  };

  const handleResultChange = (id: string, newResult: BidData['result']) => {
    setData(prev => prev.map(d => d.id === id ? { ...d, result: newResult } : d));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">입찰 데이터 관리</h2>
          <p className="text-gray-500 mt-1">과거 데이터를 체계적으로 관리하고 최적의 투찰가를 산정하세요.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          <span>새 내역 추가</span>
        </button>
      </div>

      <AddEstimationModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={(newItems) => {
          setData(prev => [...prev, ...newItems]);
          setIsAddModalOpen(false);
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: '누적 데이터', value: `${stats.total} 건`, color: 'blue' },
          { label: '평균 낙찰률', value: `${stats.winRate.toFixed(1)}%`, color: 'emerald' },
          { label: '평균 단가(합계)', value: `₩${Math.round(stats.avgPrice).toLocaleString()}`, color: 'indigo' },
          { label: '최근 30일 투찰', value: `${stats.recentBids} 건`, color: 'orange' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <div className={cn("h-1 w-full mt-4 rounded-full opacity-20", `bg-${stat.color}-500`)} />
          </div>
        ))}
      </div>

      {/* AI Insight Section */}
      <div className="bg-[#1a1c1e] text-white p-8 rounded-3xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI 비딩 인사이트</h3>
              <p className="text-xs text-gray-400">축적된 데이터를 기반으로 전략적 조언을 드립니다.</p>
            </div>
          </div>
          
          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="예: 이동식들비계의 최근 낙찰 단가 추이를 알려줘"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['#낙찰 전략 분석', '#단가 상승률 확인', '#탈락 원인 통계'].map(tag => (
              <button key={tag} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-sm font-medium">
              <span className="text-gray-400">현장:</span>
              <select 
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold cursor-pointer"
              >
                {sites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="항목명, 규격으로 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm w-80 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">견적일자</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">항목</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">규격</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">단위</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">재료비</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">노무비</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">경비</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">합계(단가)</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">결과</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">상세</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item) => {
                const total = item.materialCost + item.laborCost + item.expense;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.item}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.spec}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.materialCost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.laborCost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.expense.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">{total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge 
                        value={item.result}
                        onChange={(val) => handleResultChange(item.id, val)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onViewDetail(item.projectId)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="text-gray-300" size={24} />
            </div>
            <p className="text-gray-400 text-sm">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EstimationDetailView = ({ 
  projectId, 
  data, 
  onBack 
}: { 
  projectId: string, 
  data: BidData[], 
  onBack: () => void 
}) => {
  const projectItems = useMemo(() => data.filter(d => d.projectId === projectId), [data, projectId]);
  const projectName = projectItems[0]?.projectName || '알 수 없는 공사';

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">{projectName}</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-900">직접비</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th rowSpan={2} className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">번호</th>
                <th rowSpan={2} className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">항목</th>
                <th rowSpan={2} className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">규격</th>
                <th rowSpan={2} className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100">단위</th>
                <th rowSpan={2} className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100 text-right">수량</th>
                <th colSpan={2} className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center border-r border-gray-100 border-b border-gray-100">재료비</th>
                <th colSpan={2} className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center border-r border-gray-100 border-b border-gray-100">노무비</th>
                <th colSpan={2} className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center border-r border-gray-100 border-b border-gray-100">경비</th>
                <th colSpan={2} className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center border-b border-gray-100">합계</th>
              </tr>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">단가</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">금액</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">단가</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">금액</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">단가</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">금액</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right border-r border-gray-100">단가</th>
                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projectItems.map((item) => {
                const totalUnitPrice = item.materialCost + item.laborCost + item.expense;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-100">{item.no}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 border-r border-gray-100">{item.item}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-100">{item.spec}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 border-r border-gray-100">{item.unit}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{item.quantity.toLocaleString()}</td>
                    
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{item.materialCost.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{(item.materialCost * item.quantity).toLocaleString()}</td>
                    
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{item.laborCost.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{(item.laborCost * item.quantity).toLocaleString()}</td>
                    
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{item.expense.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right border-r border-gray-100">{(item.expense * item.quantity).toLocaleString()}</td>
                    
                    <td className="px-4 py-4 text-sm font-bold text-blue-600 text-right border-r border-gray-100">{totalUnitPrice.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm font-bold text-blue-600 text-right">{(totalUnitPrice * item.quantity).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AddEstimationModal = ({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (items: BidData[]) => void 
}) => {
  const [projectName, setProjectName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Partial<BidData>[]>([
    { id: Math.random().toString(), no: '1', item: '', spec: '', unit: '', quantity: 0, materialCost: 0, laborCost: 0, expense: 0, result: '낙찰' }
  ]);

  if (!isOpen) return null;

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), no: '', item: '', spec: '', unit: '', quantity: 0, materialCost: 0, laborCost: 0, expense: 0, result: '낙찰' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BidData, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = () => {
    if (!projectName) {
      alert('공사명을 입력해주세요.');
      return;
    }
    const projectId = 'P' + Date.now();
    const newBidData: BidData[] = items.map(item => ({
      ...item,
      projectId,
      projectName,
      date,
    } as BidData));
    onSave(newBidData);
    // Reset
    setProjectName('');
    setItems([{ id: Math.random().toString(), no: '1', item: '', spec: '', unit: '', quantity: 0, materialCost: 0, laborCost: 0, expense: 0, result: '낙찰' }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">새 내역 추가</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Plus className="rotate-45 text-gray-400" size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">공사명 (현장명)</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="예: 포웰시티, 푸르지오 등"
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">견적일자</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-bold text-gray-900">항목 리스트</h4>
            <button 
              onClick={addItem}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus size={16} />
              항목 추가
            </button>
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">번호</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">항목</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">규격</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">단위</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">수량</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">재료비</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">노무비</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">경비</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">결과</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={item.no} 
                        onChange={(e) => updateItem(item.id!, 'no', e.target.value)}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={item.item} 
                        onChange={(e) => updateItem(item.id!, 'item', e.target.value)}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm font-bold"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={item.spec} 
                        onChange={(e) => updateItem(item.id!, 'spec', e.target.value)}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={item.unit} 
                        onChange={(e) => updateItem(item.id!, 'unit', e.target.value)}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(item.id!, 'quantity', Number(e.target.value))}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="number" 
                        value={item.materialCost} 
                        onChange={(e) => updateItem(item.id!, 'materialCost', Number(e.target.value))}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="number" 
                        value={item.laborCost} 
                        onChange={(e) => updateItem(item.id!, 'laborCost', Number(e.target.value))}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="number" 
                        value={item.expense} 
                        onChange={(e) => updateItem(item.id!, 'expense', Number(e.target.value))}
                        className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <StatusBadge 
                        value={item.result as any}
                        onChange={(val) => updateItem(item.id!, 'result', val)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button 
                        onClick={() => removeItem(item.id!)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-all"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            저장하기
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const HomeView = ({ onOpenTab }: { onOpenTab: (v: View) => void }) => {
  return (
    <div className="p-12 max-w-6xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900">NAMI Business Suite</h2>
        <p className="text-xl text-gray-500 mt-4">효율적인 업무 관리를 위한 통합 솔루션에 오신 것을 환영합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button 
          onClick={() => onOpenTab('mail-summary')}
          className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Mail size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">메일 요약 서비스</h3>
          <p className="text-gray-500">AI를 활용하여 수신된 메일의 핵심 내용을 빠르게 파악하고 후속 조치를 관리하세요.</p>
        </button>

        <button 
          onClick={() => onOpenTab('estimation')}
          className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FileText size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">견적 프로그램</h3>
          <p className="text-gray-500">과거 입찰 데이터를 체계적으로 분석하여 최적의 투찰 전략을 수립하세요.</p>
        </button>
      </div>

      <div className="mt-12 p-8 bg-gray-900 rounded-3xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full -mr-48 -mt-48"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="text-blue-400" />
            오늘의 업무 인사이트
          </h3>
          <p className="text-gray-400 max-w-2xl">
            데이터 분석 결과, 최근 30일간의 낙찰률이 이전 달 대비 15% 상승했습니다. 
            특히 '이동식들비계' 항목에서 경쟁력 있는 단가를 유지하고 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

const TabBar = ({ 
  tabs, 
  activeTab, 
  onSwitch, 
  onClose 
}: { 
  tabs: View[], 
  activeTab: View, 
  onSwitch: (v: View) => void, 
  onClose: (v: View) => void 
}) => {
  if (tabs.length === 0) return null;

  const getLabel = (v: View) => {
    switch (v) {
      case 'mail-summary': return '메일 요약';
      case 'estimation': return '견적프로그램';
      case 'estimation-detail': return '견적 상세';
      default: return '';
    }
  };

  const getIcon = (v: View) => {
    switch (v) {
      case 'mail-summary': return <Mail size={14} />;
      case 'estimation': return <FileText size={14} />;
      case 'estimation-detail': return <FileText size={14} />;
      default: return null;
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 px-8 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
      {tabs.map(tab => (
        <div 
          key={tab}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            activeTab === tab ? "bg-blue-50 text-blue-600 shadow-sm" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
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

export default function App() {
  const [view, setView] = useState<View>('home');
  const [openTabs, setOpenTabs] = useState<View[]>([]);
  const [bidData, setBidData] = useState<BidData[]>(INITIAL_BID_DATA);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const [mailSummaryState, setMailSummaryState] = useState<MailSummaryState>({
    date: new Date().toISOString().split('T')[0],
    folderFilter: '전체',
    folders: ['전체'],
    isLoadingEmails: false,
    isSummarizing: false,
    summary: null,
    emails: [],
    selectedEmail: null,
    emailSearch: ''
  });

  const handleOpenTab = (v: View) => {
    if (!openTabs.includes(v)) {
      setOpenTabs([...openTabs, v]);
    }
    setView(v);
  };

  const handleCloseTab = (v: View) => {
    const newTabs = openTabs.filter(t => t !== v);
    setOpenTabs(newTabs);
    
    // Reset state if closing
    if (v === 'mail-summary') {
      setMailSummaryState({
        date: new Date().toISOString().split('T')[0],
        folderFilter: '전체',
        folders: ['전체'],
        isLoadingEmails: false,
        isSummarizing: false,
        summary: null,
        emails: [],
        selectedEmail: null,
        emailSearch: ''
      });
    }

    if (view === v) {
      if (newTabs.length > 0) {
        setView(newTabs[newTabs.length - 1]);
      } else {
        setView('home');
      }
    }
  };

  const handleViewDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    handleOpenTab('estimation-detail');
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-900 overflow-hidden">
      <Sidebar 
        currentView={view === 'estimation-detail' ? 'estimation' : view} 
        setView={setView} 
        openTabs={openTabs}
        onOpenTab={handleOpenTab}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onGoHome={() => setView('home')} />
        <TabBar 
          tabs={openTabs} 
          activeTab={view} 
          onSwitch={setView} 
          onClose={handleCloseTab} 
        />
        
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view + (selectedProjectId || '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'home' && <HomeView onOpenTab={handleOpenTab} />}
              {view === 'mail-summary' && (
                <MailSummaryView 
                  state={mailSummaryState} 
                  setState={setMailSummaryState} 
                />
              )}
              {view === 'estimation' && (
                <EstimationProgramView 
                  data={bidData} 
                  setData={setBidData} 
                  onViewDetail={handleViewDetail}
                />
              )}
              {view === 'estimation-detail' && selectedProjectId && (
                <EstimationDetailView 
                  projectId={selectedProjectId} 
                  data={bidData} 
                  onBack={() => {
                    handleCloseTab('estimation-detail');
                    setView('estimation');
                  }} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
