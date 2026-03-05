export type View = 'home' | 'mail-summary' | 'estimation' | 'estimation-detail';

export interface BidData {
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

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  fromAI: boolean;
  memo: string;
}

export interface DayData {
  todos: TodoItem[];
  memo: string;
  deletedTodos: string[];
}

export interface Email {
  id: number;
  folder: string;
  subject: string;
  sender: string;
  received_at: string;
  is_after_hours: boolean;
  body: string;
}

export interface MailSummaryState {
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
