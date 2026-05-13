import React from 'react';
import { motion } from 'motion/react';
import { Book, Note, Flashcard, GlossaryTerm } from '../types';
import { BarChart3, Clock, BookOpen, MessageSquare, Timer, Zap, BrainCircuit, Type } from 'lucide-react';

interface BookStatsProps {
  book: Book;
  notes: Note[];
  flashcards: Flashcard[];
  terms: GlossaryTerm[];
}

export const BookStats: React.FC<BookStatsProps> = ({ book, notes, flashcards, terms }) => {
  const totalNotes = notes.length;
  const favoriteNotes = notes.filter(n => n.isFavorite).length;
  const totalWords = notes.reduce((acc, note) => acc + note.content.split(/\s+/).length, 0);
  const avgWordsPerNote = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;
  
  const progress = book.totalPages && book.totalPages > 0 
    ? Math.round(((book.currentPage || 0) / book.totalPages) * 100) 
    : 0;

  const stats = [
    { label: 'Notas Totales', value: totalNotes, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Ideas Destacadas', value: favoriteNotes, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Palabras Clave', value: terms.length, icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Flashcards', value: flashcards.length, icon: Timer, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col items-center text-center"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} mb-4 shadow-sm`}>
              <stat.icon size={24} />
            </div>
            <span className="text-2xl font-display font-black text-gray-900 dark:text-white mb-1">{stat.value}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <BarChart3 size={20} />
            </div>
            <h3 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">Progreso de Lectura</h3>
          </div>
          
          <div className="flex items-end gap-4 mb-4">
            <span className="text-5xl font-display font-black text-gray-900 dark:text-white">{progress}%</span>
            <span className="text-gray-400 font-serif italic mb-2">completado</span>
          </div>

          <div className="w-full h-4 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Páginas leídas</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{book.currentPage || 0}</span>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total páginas</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{book.totalPages || '???'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
              <Type size={20} />
            </div>
            <h3 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">Densidad de Ideas</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total de Palabras en Notas</span>
                <span className="text-gray-900 dark:text-white font-bold">{totalWords}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-blue-500" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Promedio de Palabras / Nota</span>
                <span className="text-gray-900 dark:text-white font-bold">{avgWordsPerNote}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (avgWordsPerNote / 200) * 100)}%` }}
                  className="h-full bg-indigo-500" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 dark:border-white/5">
              <p className="text-gray-500 dark:text-gray-400 font-serif italic text-sm leading-relaxed">
                {totalNotes > 5 
                  ? "Tu nivel de reflexión es notable. Has capturado una cantidad significativa de conocimiento de esta obra." 
                  : "Estás comenzando tu viaje de análisis. Cada nota es una semilla de comprensión."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-500 p-8 rounded-[2.5rem] shadow-xl shadow-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
          <Zap size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-3xl font-display font-black text-black uppercase tracking-tighter mb-2">Retos de Lectura</h3>
            <p className="text-black/70 font-serif italic max-w-sm">
              Supera estos desafíos para convertirte en un maestro de la comprensión literaria.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {[
              { label: 'Analista Novel', task: 'Crea 3 notas', done: totalNotes >= 3 },
              { label: 'Estratega del Glosario', task: 'Guarda 5 palabras', done: terms.length >= 5 },
              { label: 'Corazón de Oro', task: 'Marca 2 favoritos', done: favoriteNotes >= 2 },
              { label: 'Estudioso Dedicado', task: 'Genera flashcards', done: flashcards.length > 0 },
            ].map((challenge) => (
              <div 
                key={challenge.label}
                className={`px-6 py-4 rounded-2xl flex items-center gap-3 border-2 transition-all ${challenge.done ? 'bg-black text-amber-500 border-black' : 'bg-transparent border-black/10 text-black/40'}`}
              >
                {challenge.done ? <CheckCircle2 size={18} /> : <Zap size={18} />}
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">{challenge.label}</p>
                  <p className="text-xs font-serif font-black">{challenge.task}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CheckCircle2 = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
