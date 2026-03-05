import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Mail,
  Search,
  Plus,
  Sparkles,
  Calendar,
  Filter,
  Database,
  RefreshCw,
  ListChecks,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import type { MailSummaryState, TodoItem, DayData } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── 로컬 타입 ────────────────────────────────────────────────────────────────

type SummaryButtonType = 'yesterday' | 'today' | 'afterwork';

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function getYesterday(dateStr: string): string {
  const base = dateStr || new Date().toISOString().split('T')[0];
  const [y, m, d] = base.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return [
    prev.getFullYear(),
    String(prev.getMonth() + 1).padStart(2, '0'),
    String(prev.getDate()).padStart(2, '0'),
  ].join('-');
}

function makeKey(date: string, type: string, folder: string): string {
  return `${date}_${type}_${folder}`;
}

function emptyDayData(base?: DayData): DayData {
  return {
    todos: base?.todos ?? [],
    memo: base?.memo ?? '',
    deletedTodos: base?.deletedTodos ?? [],
  };
}

// ─── TodoItemRow ─────────────────────────────────────────────────────────────

const TodoItemRow = React.memo(function TodoItemRow({
  item,
  onToggle,
  onDelete,
  onMemoChange,
}: {
  item: TodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string, text: string) => void;
  onMemoChange: (id: string, memo: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 group">
      <div className="flex items-center gap-2 flex-[3] min-w-0">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggle(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded cursor-pointer accent-blue-600 shrink-0"
        />
        <span
          className={cn(
            'flex-1 text-sm truncate',
            item.done ? 'line-through text-gray-400' : 'text-gray-700'
          )}
        >
          {item.text}
        </span>
        {item.fromAI && (
          <Sparkles size={12} className="text-blue-400 shrink-0" title="AI가 추출한 항목" />
        )}
        <button
          onClick={() => onDelete(item.id, item.text)}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="삭제"
        >
          <Plus className="rotate-45" size={14} />
        </button>
      </div>
      <input
        type="text"
        value={item.memo ?? ''}
        onChange={(e) => onMemoChange(item.id, e.target.value)}
        placeholder="비고..."
        className="flex-[2] border-none bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-600 placeholder:text-gray-300 focus:outline-none focus:bg-blue-50 transition-colors min-w-0"
      />
    </div>
  );
});

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export const MailSummaryView = ({
  state,
  setState,
  dayDataMap,
  setDayDataMap,
}: {
  state: MailSummaryState;
  setState: React.Dispatch<React.SetStateAction<MailSummaryState>>;
  dayDataMap: Record<string, DayData>;
  setDayDataMap: React.Dispatch<React.SetStateAction<Record<string, DayData>>>;
}) => {
  const updateState = (updates: Partial<MailSummaryState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // ── 로컬 상태
  const [summaryKey, setSummaryKey] = useState<string | null>(null);
  const [activeSummaryType, setActiveSummaryType] = useState<SummaryButtonType | null>(null);
  const [summarizingType, setSummarizingType] = useState<SummaryButtonType | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    date: string;
    type: string;
    folder: string;
    buttonType: SummaryButtonType;
  } | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [todoInput, setTodoInput] = useState('');
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'info' } | null>(null);

  // ── 현재 활성 요약 컨텍스트
  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeType, setActiveType] = useState<string>('일별');
  const [activeFolder, setActiveFolder] = useState<string>('전체');

  const currentKey = makeKey(activeDate, activeType, activeFolder);
  const currentTodos = dayDataMap[currentKey]?.todos || [];

  // ── AI todos 순차 추가 (300ms 간격, 기존 AI 항목 제거 후, deletedTodos 필터링)
  const addTodosToKey = useCallback(
    async (key: string, todos: string[]) => {
      setDayDataMap((prev) => ({
        ...prev,
        [key]: {
          ...emptyDayData(prev[key]),
          todos: (prev[key]?.todos || []).filter((t) => !t.fromAI),
        },
      }));
      for (let i = 0; i < todos.length; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        setDayDataMap((prev) => {
          const deleted = prev[key]?.deletedTodos || [];
          const existing = prev[key]?.todos || [];
          const isAlreadyExists = existing.some((t) => t.text === todos[i]);
          const isDeleted = deleted.includes(todos[i]);
          if (isAlreadyExists || isDeleted) return prev;
          return {
            ...prev,
            [key]: {
              ...prev[key],
              todos: [
                ...existing,
                {
                  id: `ai-${Date.now()}-${i}`,
                  text: todos[i],
                  done: false,
                  createdAt: new Date().toISOString(),
                  fromAI: true,
                  memo: '',
                },
              ],
            },
          };
        });
      }
    },
    [setDayDataMap]
  );

  // ── 마운트 시 오늘 요약 복원 (DB 캐시 + todos)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const key = makeKey(today, '일별', '전체');
    const params = new URLSearchParams({ date: today, type: '일별', folder: '전체' });
    fetch(`/api/summary?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          updateState({ summary: data.summary });
          setSummaryKey(key);
          setActiveSummaryType('today');
          if (Array.isArray(data.todos) && data.todos.length > 0) {
            setDayDataMap((prev) => {
              if (prev[key]?.todos?.length) return prev;
              const deleted = prev[key]?.deletedTodos || [];
              return {
                ...prev,
                [key]: {
                  ...emptyDayData(prev[key]),
                  todos: (data.todos as string[])
                    .filter((t) => !deleted.includes(t))
                    .map((t, i) => ({
                      id: `ai-restore-${i}`,
                      text: t,
                      done: false,
                      createdAt: new Date().toISOString(),
                      fromAI: true,
                      memo: '',
                    })),
                },
              };
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── 폴더 목록 fetch (최초 1회)
  useEffect(() => {
    fetch('/api/folders')
      .then((res) => res.json())
      .then((data) => updateState({ folders: ['전체', ...(data.folders || [])] }))
      .catch(() => updateState({ folders: ['전체'] }));
  }, []);

  // ── 날짜 또는 폴더 필터 변경 시 메일 목록 fetch
  useEffect(() => {
    updateState({ isLoadingEmails: true, emails: [] });
    const params = new URLSearchParams();
    if (state.date) params.set('date', state.date);
    if (state.folderFilter && state.folderFilter !== '전체')
      params.set('folder', state.folderFilter);
    fetch(`/api/emails?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => updateState({ emails: data.emails || [], isLoadingEmails: false }))
      .catch(() => updateState({ emails: [], isLoadingEmails: false }));
  }, [state.date, state.folderFilter]);

  // ── 메일 검색 필터
  const filteredEmails = useMemo(() => {
    const search = state.emailSearch.toLowerCase();
    return state.emails.filter(
      (email) =>
        email.sender.toLowerCase().includes(search) ||
        email.subject.toLowerCase().includes(search)
    );
  }, [state.emails, state.emailSearch]);

  // ── 요약 API 호출
  const callSummaryApi = async (
    date: string,
    type: string,
    folder: string,
    buttonType: SummaryButtonType,
    isRegenerate = false
  ) => {
    const key = makeKey(date, type, folder);
    setSummarizingType(buttonType);
    updateState({ isSummarizing: true, summary: null, selectedEmail: null });
    setActiveDate(date);
    setActiveType(type);
    setActiveFolder(folder);

    let aiTodos: string[] = [];

    try {
      if (isRegenerate) {
        const delParams = new URLSearchParams({ date, type, folder });
        await fetch(`/api/summary?${delParams.toString()}`, { method: 'DELETE' });
      }
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, folder }),
      });
      const data = await res.json();
      updateState({ summary: data.summary || '요약을 생성할 수 없습니다.' });
      setSummaryKey(key);
      setActiveSummaryType(buttonType);
      aiTodos = Array.isArray(data.todos) ? (data.todos as string[]) : [];
    } catch (error) {
      console.error(error);
      updateState({ summary: 'AI 요약 중 오류가 발생했습니다.' });
    } finally {
      updateState({ isSummarizing: false });
      setSummarizingType(null);
    }

    if (aiTodos.length > 0) {
      await addTodosToKey(key, aiTodos);
    }
  };

  // ── 요약 버튼 클릭 (재클릭 감지)
  const handleSummaryButton = (
    date: string,
    type: string,
    folder: string,
    buttonType: SummaryButtonType
  ) => {
    const key = makeKey(date, type, folder);
    if (state.summary && summaryKey === key) {
      setConfirmModal({ date, type, folder, buttonType });
    } else {
      callSummaryApi(date, type, folder, buttonType);
    }
  };

  // ── 이전 요약 보기 (모달 닫기 + todos 복원)
  const handleViewPrevSummary = async () => {
    if (!confirmModal) return;
    const { date, type, folder, buttonType } = confirmModal;
    const key = makeKey(date, type, folder);
    setConfirmModal(null);
    setActiveDate(date);
    setActiveType(type);
    setActiveFolder(folder);
    setActiveSummaryType(buttonType);
    if (!dayDataMap[key]?.todos?.length) {
      try {
        const params = new URLSearchParams({ date, type, folder });
        const data = await fetch(`/api/summary?${params.toString()}`).then((r) => r.json());
        if (Array.isArray(data.todos) && data.todos.length > 0) {
          await addTodosToKey(key, data.todos);
        }
      } catch {}
    }
  };

  // ── 메일 새로고침
  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const collectRes = await fetch('/api/collect', { method: 'POST' });
      const collectData = await collectRes.json();

      if (collectData.status === 'busy') {
        setToast({ message: '이미 수집 중입니다.', variant: 'info' });
        setTimeout(() => setToast(null), 2000);
        return;
      }

      // DB 트랜잭션 완전 반영 대기
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const params = new URLSearchParams();
      if (state.date) params.set('date', state.date);
      if (state.folderFilter && state.folderFilter !== '전체')
        params.set('folder', state.folderFilter);
      const res = await fetch(`/api/emails?${params.toString()}`);
      const data = await res.json();
      updateState({ emails: data.emails || [] });

      const saved = (collectData.saved as number) ?? 0;
      setToast({
        message: saved > 0 ? `새 메일 ${saved}건이 수집되었습니다.` : '새 메일이 없습니다.',
        variant: saved > 0 ? 'success' : 'info',
      });
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCollecting(false);
    }
  };

  // ── 할 일 핸들러 (useCallback으로 안정화)
  const handleToggle = useCallback(
    (id: string) => {
      setDayDataMap((prev) => {
        const current = prev[currentKey] ?? emptyDayData();
        return {
          ...prev,
          [currentKey]: {
            ...current,
            todos: current.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
          },
        };
      });
    },
    [currentKey, setDayDataMap]
  );

  // 삭제 버튼 클릭 → 확인 팝업 표시
  const handleDelete = useCallback(
    (id: string, text: string) => {
      setDeleteConfirmModal({ id, text });
    },
    [setDeleteConfirmModal]
  );

  // 팝업에서 [삭제] 확인 → 실제 삭제 + deletedTodos에 text 추가
  const confirmDelete = useCallback(() => {
    if (!deleteConfirmModal) return;
    const { id, text } = deleteConfirmModal;
    setDeleteConfirmModal(null);
    setDayDataMap((prev) => {
      const current = prev[currentKey] ?? emptyDayData();
      return {
        ...prev,
        [currentKey]: {
          ...current,
          todos: current.todos.filter((t) => t.id !== id),
          deletedTodos: [...(current.deletedTodos || []), text],
        },
      };
    });
  }, [deleteConfirmModal, currentKey, setDayDataMap]);

  const handleMemoChange = useCallback(
    (id: string, memo: string) => {
      setDayDataMap((prev) => {
        const current = prev[currentKey] ?? emptyDayData();
        return {
          ...prev,
          [currentKey]: {
            ...current,
            todos: current.todos.map((t) => (t.id === id ? { ...t, memo } : t)),
          },
        };
      });
    },
    [currentKey, setDayDataMap]
  );

  const addTodo = () => {
    if (!todoInput.trim()) return;
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: todoInput.trim(),
      done: false,
      createdAt: new Date().toISOString(),
      fromAI: false,
      memo: '',
    };
    setDayDataMap((prev) => ({
      ...prev,
      [currentKey]: {
        ...emptyDayData(prev[currentKey]),
        todos: [...(prev[currentKey]?.todos || []), newTodo],
      },
    }));
    setTodoInput('');
  };

  // ── 요약 버튼 정의
  const summaryButtons: Array<{
    key: SummaryButtonType;
    label: string;
    date: string;
    type: string;
  }> = [
    { key: 'yesterday', label: '어제', date: getYesterday(state.date), type: '일별' },
    { key: 'today', label: '오늘', date: state.date, type: '일별' },
    { key: 'afterwork', label: '퇴근 후', date: state.date, type: '퇴근후' },
  ];

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">메일 요약 서비스</h2>
        <p className="text-gray-500 mt-2">
          메일 내용을 분석하여 AI가 학습할 수 있도록 준비하고 핵심 내용을 요약합니다.
        </p>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-wrap items-center justify-between gap-6">
        {/* 날짜 선택 + 필터 초기화 + 새로고침 */}
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
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
          <div className="h-8 w-px bg-gray-100 hidden md:block" />
          <button
            onClick={() =>
              updateState({
                date: new Date().toISOString().split('T')[0],
                folderFilter: '전체',
              })
            }
            className="flex items-center gap-2 px-4 py-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-sm font-medium"
            title="필터 초기화"
          >
            <Filter size={16} />
            <span>필터 초기화</span>
          </button>
          <button
            onClick={handleCollect}
            disabled={isCollecting}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={isCollecting ? 'animate-spin' : ''} />
            <span>{isCollecting ? '수집 중...' : '메일 새로고침'}</span>
          </button>
        </div>

        {/* 요약 버튼 3개 */}
        <div className="flex items-center gap-2">
          {summaryButtons.map((btn) => {
            const isActive = activeSummaryType === btn.key;
            const isBtnSummarizing = state.isSummarizing && summarizingType === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() =>
                  handleSummaryButton(btn.date, btn.type, state.folderFilter, btn.key)
                }
                disabled={state.isSummarizing}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 text-sm',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {isBtnSummarizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>{btn.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 메일 목록 + AI 요약 결과 */}
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

          {/* 폴더 필터 드롭다운 */}
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-gray-400 shrink-0" />
            <select
              value={state.folderFilter}
              onChange={(e) => updateState({ folderFilter: e.target.value })}
              className="flex-1 p-2 bg-gray-50 border-none rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {state.folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
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
                <div className="w-5 h-5 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">메일 불러오는 중...</span>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => updateState({ selectedEmail: email })}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl transition-all group border',
                    state.selectedEmail?.id === email.id
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-gray-50 border-transparent hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{email.sender}</span>
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                        {email.folder}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-gray-400 font-mono">
                        {email.received_at.replace('T', ' ').slice(0, 16)}
                      </span>
                      {email.is_after_hours && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">
                          퇴근후
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      'text-sm transition-colors line-clamp-1',
                      state.selectedEmail?.id === email.id
                        ? 'text-blue-700'
                        : 'text-gray-600 group-hover:text-blue-600'
                    )}
                  >
                    {email.subject}
                  </p>
                </button>
              ))
            )}
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
            <span className="text-xs text-gray-400 font-mono uppercase tracking-tighter">
              Generated by Gemini AI
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {state.isSummarizing ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
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

      {/* 할 일 · 비고 패널 */}
      <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
          <ListChecks className="text-blue-500" size={20} />
          할 일 · 비고
          <span className="text-xs font-normal text-gray-400 ml-1">
            {activeDate}
            {activeType === '퇴근후' ? ' · 퇴근 후' : ''}
          </span>
        </h3>

        {/* 입력창 */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="할 일을 입력하세요..."
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1 p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <button
            onClick={addTodo}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            추가
          </button>
        </div>

        {/* 컬럼 헤더 */}
        {currentTodos.length > 0 && (
          <div className="flex items-center gap-2 px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span className="flex-[3]">할 일</span>
            <span className="flex-[2]">비고</span>
          </div>
        )}

        {/* 목록 — 추가 순서 고정, 정렬 없음 */}
        <div className="space-y-2">
          {currentTodos.map((todo) => (
            <TodoItemRow
              key={todo.id}
              item={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onMemoChange={handleMemoChange}
            />
          ))}
          {currentTodos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">할 일이 없습니다.</p>
          )}
        </div>
      </div>

      {/* 토스트 메시지 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(
              'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-2 shadow-lg text-sm font-medium text-white',
              toast.variant === 'success' ? 'bg-green-500' : 'bg-gray-600'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 재생성 확인 모달 */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-gray-700 font-medium text-center mb-6 text-base">
                이미 생성된 요약이 있습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleViewPrevSummary}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  이전 요약 보기
                </button>
                <button
                  onClick={() => {
                    const { date, type, folder, buttonType } = confirmModal;
                    setConfirmModal(null);
                    callSummaryApi(date, type, folder, buttonType, true);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  재생성
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 할 일 삭제 확인 모달 */}
      <AnimatePresence>
        {deleteConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setDeleteConfirmModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-gray-700 font-medium text-center mb-2 text-base">
                할 일을 삭제하시겠습니까?
              </p>
              <p className="text-gray-500 text-sm text-center mb-6 break-words">
                '{deleteConfirmModal.text}' 항목을 삭제하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메일 상세 모달 */}
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
                    <p className="text-xs text-gray-500">
                      {state.selectedEmail.received_at.replace('T', ' ').slice(0, 16)} 수신
                    </p>
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
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {state.selectedEmail.subject}
                </h3>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold">
                    {state.selectedEmail.folder}
                  </span>
                  {state.selectedEmail.is_after_hours && (
                    <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold">
                      퇴근 후 수신
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {state.selectedEmail.body ? (
                    <span className="text-gray-700">{state.selectedEmail.body}</span>
                  ) : (
                    <span className="text-gray-400 italic">본문 없음</span>
                  )}
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
