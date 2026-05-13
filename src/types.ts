export type BookStatus = 'Leyendo' | 'Terminado' | 'Por leer';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string; // Optional cover image URL
  summary?: string; // Optional book summary
  status: BookStatus;
  addedAt: number;
  currentPage?: number;
  totalPages?: number;
  rating?: number; // 1-5
}

export interface Note {
  id: string;
  bookId: string;
  content: string;
  reference?: string; // e.g. "Capítulo 1", "Pág. 45"
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
  relatedNoteIds?: string[];
  audioData?: string;
  audioStartTime?: number;
  audioEndTime?: number;
}

export interface Insight {
  id: string;
  bookId: string;
  title: string;
  description: string;
  type: 'connection' | 'epiphany' | 'application';
  createdAt: number;
}

export interface Flashcard {
  id: string;
  bookId: string;
  question: string;
  answer: string;
  createdAt: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GlossaryTerm {
  id: string;
  bookId: string;
  word: string;
  definition: string;
  context?: string;
  createdAt: number;
}

