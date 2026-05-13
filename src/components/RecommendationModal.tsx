import React from 'react';
import { BookRecommendation } from '../types';
import { X, ExternalLink, BookOpen, User, Tag, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  recommendation: BookRecommendation | null;
  onClose: () => void;
  onAdd: (rec: BookRecommendation) => void;
}

export function RecommendationModal({ recommendation, onClose, onAdd }: Props) {
  if (!recommendation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] relative z-10"
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-500">
            <X size={20} />
          </button>
          
          <div className="p-8">
            <div className="flex gap-6">
              {recommendation.coverUrl && (
                <img src={recommendation.coverUrl} alt={recommendation.title} className="w-24 h-36 object-cover rounded-xl shadow-lg" />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-display font-black text-gray-900 dark:text-white mb-1">{recommendation.title}</h2>
                <div className="flex items-center gap-2 text-gray-500 font-serif italic text-sm mb-4">
                  <User size={14} />
                  {recommendation.author}
                </div>
                {recommendation.genre && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                    <Tag size={10} />
                    {recommendation.genre}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 flex-1 overflow-y-auto">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Por qué te lo recomendamos</h4>
            <p className="text-gray-600 dark:text-gray-400 font-serif leading-relaxed mb-6">{recommendation.reason}</p>
            
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Descripción</h4>
            <p className="text-gray-600 dark:text-gray-400 font-serif leading-relaxed mb-8">{recommendation.description || 'No hay descripción disponible para este libro.'}</p>
          </div>

          {recommendation.pdfUrl || true ? (
            <div className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-2">
              {recommendation.pdfUrl && (
                <a href={recommendation.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                  <ExternalLink size={16} />
                  Leer PDF
                </a>
              )}
              <button 
                onClick={() => onAdd(recommendation)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-amber-400 transition-all"
              >
                <Plus size={16} />
                Añadir libro
              </button>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
