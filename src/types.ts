export type BookStatus = 'Leyendo' | 'Terminado' | 'Por leer' | 'Abandonado';

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string;
  coverUrl?: string;
  summary?: string;
  status: BookStatus;
  addedAt: number;
  currentPage?: number;
  totalPages?: number;
  rating?: number;
}

export interface Note {
  id: string;
  userId: string;
  bookId: string;
  content: string;
  reference?: string;
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
  userId: string;
  bookId: string;
  title: string;
  description: string;
  type: 'connection' | 'epiphany' | 'application';
  createdAt: number;
}

export interface BookRecommendation {
  id: string;
  bookId: string;
  title: string;
  author: string;
  reason: string;
  pdfUrl?: string;
  description?: string;
  coverUrl?: string;
  genre?: string;
  isbn?: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  userId: string;
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
  userId: string;
  bookId: string;
  word: string;
  definition: string;
  context?: string;
  createdAt: number;
}

