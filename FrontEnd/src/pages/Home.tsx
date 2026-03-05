import React from 'react';
import { Mail, FileText, Sparkles } from 'lucide-react';
import type { View } from '../types';

export const HomeView = ({ onOpenTab }: { onOpenTab: (v: View) => void }) => {
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
