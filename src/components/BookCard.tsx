import React, { useState } from 'react';
import { Book } from '../types';
import { Image as ImageIcon, Trash2, Book as BookIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  book: Book;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function BookCard({ book, onClick, onDelete }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Determine color accents based on status
  const statusColor = 
    book.status === 'Terminado' ? 'bg-green-100/80 text-green-700 border-green-200/50 shadow-sm' : 
    book.status === 'Leyendo' ? 'bg-amber-100/80 text-amber-700 border-amber-200/50 shadow-sm' : 
    'bg-gray-100/80 text-gray-700 border-gray-200/50 shadow-sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col h-full relative cursor-pointer"
      onClick={() => onClick(book.id)}
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className="absolute z-30 -top-2 -right-2 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-xl border border-gray-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-950 active:scale-90"
          title="Eliminar libro"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Book Cover Container */}
      <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] mb-6 ring-1 ring-black/5 dark:ring-white/5">
        <div className="w-full h-full relative transition-transform duration-500 group-hover:scale-105">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={`Portada de ${book.title}`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-400 p-6">
              <ImageIcon size={40} className="mb-4 opacity-20" />
              <span className="text-xs font-serif font-black text-center line-clamp-3 leading-tight uppercase tracking-widest opacity-40">{book.title}</span>
            </div>
          )}
          
          {/* Status Badge Over Cover */}
          <div className="absolute top-4 left-4 z-20">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md border border-white/20 ${
              book.status === 'Terminado' ? 'bg-green-500/80 text-white' : 
              book.status === 'Leyendo' ? 'bg-amber-500/80 text-black' : 
              'bg-gray-900/80 text-white dark:bg-black/80'
            }`}>
              {book.status}
            </div>
          </div>

          {/* Elegant Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
            <div className="flex items-center gap-2 text-white/90 text-xs font-bold uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <span>Ver detalles</span>
              <BookIcon size={12} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center text-center px-1">
        <h3 className="font-display font-black text-gray-900 dark:text-white leading-[1.2] mb-1 line-clamp-2 text-base md:text-[1.1rem] group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors uppercase tracking-tight">{book.title}</h3>
        <p className="font-serif italic text-sm text-gray-400 dark:text-gray-500 line-clamp-1 mb-4">{book.author}</p>
        
        {book.totalPages && book.totalPages > 0 && (
          <div className="w-full max-w-[120px] mt-auto">
            <div className="w-full h-0.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, ((book.currentPage || 0) / book.totalPages) * 100))}%` }}
                className={`h-full rounded-full ${book.status === 'Terminado' ? 'bg-green-500' : 'bg-amber-500'}`}
              />
            </div>
            <div className="flex justify-center text-[9px] text-gray-300 dark:text-gray-700 font-black uppercase tracking-[0.2em]">
              <span>{Math.round(((book.currentPage || 0) / book.totalPages) * 100)}%</span>
            </div>
          </div>
        )}
      </div>


      <ConfirmModal
        isOpen={showConfirm}
        title="Eliminar libro"
        message="¿Estás seguro de que deseas eliminar este libro? Se perderán todas tus notas y palabras del glosario asociadas."
        onConfirm={() => {
          setShowConfirm(false);
          if (onDelete) onDelete(book.id);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </motion.div>
  );
}
