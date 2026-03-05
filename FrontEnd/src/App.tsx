/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { HomeView } from './pages/Home';
import { MailSummaryView } from './pages/MailSummary';
import { EstimationPage } from './pages/Estimation';

import type { View, MailSummaryState, DayData } from './types';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [openTabs, setOpenTabs] = useState<View[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [mailDayDataMap, setMailDayDataMap] = useState<Record<string, DayData>>({});

  const [mailSummaryState, setMailSummaryState] = useState<MailSummaryState>({
    date: new Date().toISOString().split('T')[0],
    folderFilter: '전체',
    folders: ['전체'],
    isLoadingEmails: false,
    isSummarizing: false,
    summary: null,
    emails: [],
    selectedEmail: null,
    emailSearch: '',
  });

  const handleOpenTab = (v: View) => {
    if (!openTabs.includes(v)) {
      setOpenTabs([...openTabs, v]);
    }
    setView(v);
  };

  const handleCloseTab = (v: View) => {
    const newTabs = openTabs.filter((t) => t !== v);
    setOpenTabs(newTabs);

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
        emailSearch: '',
      });
    }

    if (view === v) {
      setView(newTabs.length > 0 ? newTabs[newTabs.length - 1] : 'home');
    }
  };

  const handleViewDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    handleOpenTab('estimation-detail');
  };

  // estimation과 estimation-detail은 동일한 EstimationPage를 사용하므로
  // AnimatePresence key를 'estimation'으로 고정해 bidData가 유지되도록 함
  const animationKey =
    view === 'estimation' || view === 'estimation-detail' ? 'estimation' : view;

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-900 overflow-hidden">
      <Sidebar
        currentView={view}
        setView={setView}
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
              key={animationKey + (selectedProjectId || '')}
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
                  dayDataMap={mailDayDataMap}
                  setDayDataMap={setMailDayDataMap}
                />
              )}

              {(view === 'estimation' || view === 'estimation-detail') && (
                <EstimationPage
                  view={view}
                  selectedProjectId={selectedProjectId}
                  onViewDetail={handleViewDetail}
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
