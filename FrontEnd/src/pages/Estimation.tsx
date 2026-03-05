import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Filter,
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BidData, View } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const INITIAL_BID_DATA: BidData[] = [
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

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({
  value,
  onChange,
}: {
  value: BidData['result'];
  onChange: (val: BidData['result']) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap',
          value === '낙찰'
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        )}
      >
        {value}
        <ChevronRight size={10} className={cn('transition-transform', isOpen ? 'rotate-90' : '')} />
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

// ─── AddEstimationModal ───────────────────────────────────────────────────────

const AddEstimationModal = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: BidData[]) => void;
}) => {
  const [projectName, setProjectName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Partial<BidData>[]>([
    {
      id: Math.random().toString(),
      no: '1',
      item: '',
      spec: '',
      unit: '',
      quantity: 0,
      materialCost: 0,
      laborCost: 0,
      expense: 0,
      result: '낙찰',
    },
  ]);

  if (!isOpen) return null;

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        no: '',
        item: '',
        spec: '',
        unit: '',
        quantity: 0,
        materialCost: 0,
        laborCost: 0,
        expense: 0,
        result: '낙찰',
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BidData, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSave = () => {
    if (!projectName) {
      alert('공사명을 입력해주세요.');
      return;
    }
    const projectId = 'P' + Date.now();
    const newBidData: BidData[] = items.map((item) => ({ ...item, projectId, projectName, date } as BidData));
    onSave(newBidData);
    setProjectName('');
    setItems([
      {
        id: Math.random().toString(),
        no: '1',
        item: '',
        spec: '',
        unit: '',
        quantity: 0,
        materialCost: 0,
        laborCost: 0,
        expense: 0,
        result: '낙찰',
      },
    ]);
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                공사명 (현장명)
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="예: 포웰시티, 푸르지오 등"
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                견적일자
              </label>
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
                      <input type="text" value={item.no} onChange={(e) => updateItem(item.id!, 'no', e.target.value)} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={item.item} onChange={(e) => updateItem(item.id!, 'item', e.target.value)} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm font-bold" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={item.spec} onChange={(e) => updateItem(item.id!, 'spec', e.target.value)} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={item.unit} onChange={(e) => updateItem(item.id!, 'unit', e.target.value)} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id!, 'quantity', Number(e.target.value))} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.materialCost} onChange={(e) => updateItem(item.id!, 'materialCost', Number(e.target.value))} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.laborCost} onChange={(e) => updateItem(item.id!, 'laborCost', Number(e.target.value))} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={item.expense} onChange={(e) => updateItem(item.id!, 'expense', Number(e.target.value))} className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500/20 rounded-lg text-sm text-right" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <StatusBadge value={item.result as any} onChange={(val) => updateItem(item.id!, 'result', val)} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeItem(item.id!)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
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
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-all">
            취소
          </button>
          <button onClick={handleSave} className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
            저장하기
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── EstimationProgramView ────────────────────────────────────────────────────

const EstimationProgramView = ({
  data,
  setData,
  onViewDetail,
}: {
  data: BidData[];
  setData: React.Dispatch<React.SetStateAction<BidData[]>>;
  onViewDetail: (projectId: string) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const sites = useMemo(() => {
    const uniqueSites = Array.from(new Set(data.map((d) => d.projectName)));
    return ['전체', ...uniqueSites];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = item.item.includes(searchTerm) || item.spec.includes(searchTerm);
      const matchesSite = siteFilter === '전체' || item.projectName === siteFilter;
      return matchesSearch && matchesSite;
    });
  }, [data, searchTerm, siteFilter]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return { total: 0, winRate: 0, avgPrice: 0, recentBids: 0 };
    const winRate = (filteredData.filter((d) => d.result === '낙찰').length / total) * 100;
    const avgPrice =
      filteredData.reduce((acc, curr) => acc + (curr.materialCost + curr.laborCost + curr.expense), 0) / total;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBids = filteredData.filter((d) => new Date(d.date) >= thirtyDaysAgo).length;
    return { total, winRate, avgPrice, recentBids };
  }, [filteredData]);

  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((d) => d.id !== id));
  };

  const handleResultChange = (id: string, newResult: BidData['result']) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, result: newResult } : d)));
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
          setData((prev) => [...prev, ...newItems]);
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
            <div className={cn('h-1 w-full mt-4 rounded-full opacity-20', `bg-${stat.color}-500`)} />
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
            {['#낙찰 전략 분석', '#단가 상승률 확인', '#탈락 원인 통계'].map((tag) => (
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
                {sites.map((site) => (
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
                      <StatusBadge value={item.result} onChange={(val) => handleResultChange(item.id, val)} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => onViewDetail(item.projectId)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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

// ─── EstimationDetailView ─────────────────────────────────────────────────────

const EstimationDetailView = ({
  projectId,
  data,
  onBack,
}: {
  projectId: string;
  data: BidData[];
  onBack: () => void;
}) => {
  const projectItems = useMemo(() => data.filter((d) => d.projectId === projectId), [data, projectId]);
  const projectName = projectItems[0]?.projectName || '알 수 없는 공사';

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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

// ─── EstimationPage (bidData 상태 관리 + 라우팅) ──────────────────────────────

export const EstimationPage = ({
  view,
  selectedProjectId,
  onViewDetail,
  onBack,
}: {
  view: View;
  selectedProjectId: string | null;
  onViewDetail: (projectId: string) => void;
  onBack: () => void;
}) => {
  const [bidData, setBidData] = useState<BidData[]>(INITIAL_BID_DATA);

  if (view === 'estimation-detail' && selectedProjectId) {
    return (
      <EstimationDetailView
        projectId={selectedProjectId}
        data={bidData}
        onBack={onBack}
      />
    );
  }

  return (
    <EstimationProgramView
      data={bidData}
      setData={setBidData}
      onViewDetail={onViewDetail}
    />
  );
};
