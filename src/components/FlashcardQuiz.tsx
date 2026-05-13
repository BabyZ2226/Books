import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard } from '../types';
import { X, ChevronRight, ChevronLeft, RotateCcw, Brain, CheckCircle2, AlertCircle } from 'lucide-react';

interface FlashcardQuizProps {
  flashcards: Flashcard[];
  onClose: () => void;
}

export const FlashcardQuiz: React.FC<FlashcardQuizProps> = ({ flashcards: initialFlashcards, onClose }) => {
  const [index, setIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [direction, setDirection] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const flashcards = initialFlashcards;
  const currentCard = flashcards[index];
  const progress = ((index + (completed ? 1 : 0)) / flashcards.length) * 100;

  const handleNext = (isCorrect?: boolean) => {
    if (isCorrect !== undefined) {
      setStats(prev => ({
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        wrong: !isCorrect ? prev.wrong + 1 : prev.wrong,
      }));
    }

    if (index < flashcards.length - 1) {
      setDirection(1);
      setIndex(index + 1);
      setIsRevealed(false);
    } else {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setIndex(0);
    setIsRevealed(false);
    setCompleted(false);
    setStats({ correct: 0, wrong: 0 });
    setDirection(0);
  };

  if (flashcards.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-950 flex flex-col font-sans overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent)] pointer-events-none" />
      
      <header className="flex items-center justify-between p-6 md:p-8 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2.5 rounded-2xl">
            <Brain size={24} className="text-black" />
          </div>
          <div>
            <h2 className="text-white font-display font-black text-xl md:text-2xl tracking-tight leading-none uppercase">Sesión de Estudio</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-amber-500" 
                />
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{index + 1} / {flashcards.length}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-4 rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
        >
          <X size={24} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          {!completed ? (
            <motion.div
              key={currentCard.id}
              initial={{ x: direction * 50, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: direction * -50, opacity: 0, scale: 1.05 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl"
            >
              <div 
                onClick={() => setIsRevealed(!isRevealed)}
                className={`bg-white dark:bg-gray-900 aspect-[4/3] rounded-[3.5rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer shadow-3xl border-4 transition-all duration-500 relative group overflow-hidden ${isRevealed ? 'border-amber-500/30' : 'border-white/5'}`}
              >
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gray-100 dark:bg-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isRevealed ? '100%' : '0%' }}
                    className="h-full bg-amber-500" 
                  />
                </div>

                <AnimatePresence mode="wait">
                  {!isRevealed ? (
                    <motion.div
                      key="q"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="space-y-6"
                    >
                      <span className="text-xs font-black text-amber-500 uppercase tracking-[0.3em]">Pregunta</span>
                      <h4 className="text-3xl md:text-5xl font-display font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                        {currentCard.question}
                      </h4>
                      <p className="text-gray-400 font-serif italic flex items-center justify-center gap-2 group-hover:text-amber-500 transition-colors">
                        <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                        Toca para revelar la respuesta
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="a"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="space-y-6"
                    >
                      <span className="text-xs font-black text-green-500 uppercase tracking-[0.3em]">Respuesta</span>
                      <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-300 font-serif italic leading-relaxed">
                        {currentCard.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isRevealed && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 mt-12 w-full"
                >
                  <button
                    onClick={() => handleNext(false)}
                    className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3 group"
                  >
                    <AlertCircle size={20} className="group-hover:scale-110 transition-transform" />
                    Necesito repasar
                  </button>
                  <button
                    onClick={() => handleNext(true)}
                    className="flex-1 py-6 rounded-[2rem] bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 group"
                  >
                    <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                    ¡Lo tengo!
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-10"
            >
              <div className="relative inline-block">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                  className="w-48 h-48 rounded-[3.5rem] border-4 border-amber-500/20 flex items-center justify-center"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-amber-500 p-8 rounded-[2.5rem] text-black shadow-2xl">
                     <CheckCircle2 size={48} />
                   </div>
                </div>
              </div>

              <div>
                <h3 className="text-4xl md:text-6xl font-display font-black text-white mb-4 uppercase tracking-tighter">¡ESTUDIO COMPLETADO!</h3>
                <p className="text-gray-400 font-serif italic text-xl">Has terminado de repasar todas las flashcards de este libro.</p>
              </div>

              <div className="flex gap-8 justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-display font-black text-green-500">{stats.correct}</span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Acertadas</span>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-display font-black text-red-500">{stats.wrong}</span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">A repasar</span>
                </div>
              </div>

              <div className="flex gap-4 max-w-md mx-auto pt-8">
                <button
                  onClick={handleReset}
                  className="flex-1 py-5 rounded-[1.75rem] bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <RotateCcw size={20} />
                  Reiniciar
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-5 rounded-[1.75rem] border border-gray-100/10 text-white hover:bg-white/5 transition-all font-black uppercase tracking-widest"
                >
                  Terminar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-8 shrink-0 text-center relative z-10 border-t border-white/5">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
          <Brain size={14} className="text-amber-500" />
          IA de Aprendizaje Acelerado BIBLIONOTAS
        </p>
      </footer>
    </div>
  );
};
