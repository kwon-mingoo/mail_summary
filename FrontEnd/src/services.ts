import { Mail, FileText } from 'lucide-react';
import type { ElementType } from 'react';

export interface ServiceDef {
  id: 'mail-summary' | 'estimation';
  label: string;
  icon: ElementType;
}

// 새 서비스 추가 시 여기에만 추가!
export const SERVICES: ServiceDef[] = [
  { id: 'mail-summary', label: '메일 요약', icon: Mail },
  { id: 'estimation', label: '견적프로그램', icon: FileText },
  //{ id: 'test', label: 'test', icon: FileText },
];
