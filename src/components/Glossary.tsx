import React, { useState } from 'react';
import { GlossaryTerm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  bookId: string;
  terms: GlossaryTerm[];
  onAddTerm: (term: Omit<GlossaryTerm, 'userId'>) => void;
  onDeleteTerm: (termId: string) => void;
}

export function Glossary({ bookId, terms, onAddTerm, onDeleteTerm }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [word, setWord] = useState('');
  const [context, setContext] = useState('');
  const [isCastingDefinition, setIsCastingDefinition] = useState(false);
  const [confirmDeleteTermId, setConfirmDeleteTermId] = useState<string | null>(null);

  const handleAddTerm = async () => {
    if (!word.trim()) return;

    try {
      setIsCastingDefinition(true);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Proporciona una definición clara, sencilla y precisa de la palabra o frase "${word.trim()}", explicada de forma que un ADOLESCENTE (12-18 años) pueda entenderla fácilmente.${
        context.trim() ? ` El contexto donde se encontró es: "${context.trim()}". ` : ' '
      }Devuelve solo el texto de la definición, evitando tecnicismos innecesarios, sin introducciones ni comillas.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const definition = response.text || 'Definición no disponible.';

      const newTerm: Omit<GlossaryTerm, 'userId'> = {
        id: crypto.randomUUID(),
        bookId,
        word: word.trim(),
        definition: definition.trim(),
        context: context.trim() || undefined,
        createdAt: Date.now(),
      };

      onAddTerm(newTerm);
      setWord('');
      setContext('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error fetching definition:', error);
      alert('Hubo un error al buscar la definición. Revisa la conexión o intenta más tarde.');
    } finally {
      setIsCastingDefinition(false);
    }
  };

  const sortedTerms = [...terms].sort((a, b) => a.word.localeCompare(b.word));

  return (
    <div className="space-y-6">
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center w-full py-4 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all font-medium gap-2"
        >
          <Plus size={18} />
          <span>Añadir palabra al glosario</span>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Palabra o Frase</label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Ej. Inefable"
                className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-transparent dark:text-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contexto (Opcional)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="La frase donde encontraste la palabra para una mejor definición..."
                className="w-full h-20 resize-none px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-transparent dark:text-white"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                disabled={isCastingDefinition}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTerm}
                disabled={!word.trim() || isCastingDefinition}
                className="flex-1 py-2 px-4 bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-xl font-medium hover:bg-black dark:hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg dark:shadow-none"
              >
                {isCastingDefinition ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <span>Definir y Añadir</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {terms.length === 0 && !isAdding && (
         <div className="text-center py-12 px-6 border border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50 dark:bg-white/5">
           <Search size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
           <p className="text-gray-500 dark:text-gray-400">Tu glosario está vacío. Añade palabras que no conozcas para guardar sus definiciones.</p>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedTerms.map((term) => (
          <motion.div
            key={term.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-none relative group"
          >
            <button
              onClick={() => setConfirmDeleteTermId(term.id)}
              className="absolute top-3 right-3 p-2 md:p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all font-bold"
            >
              <Trash2 size={16} />
            </button>
            <h4 className="font-serif font-bold text-xl text-gray-900 dark:text-white mb-2 capitalize">{term.word}</h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">{term.definition}</p>
            {term.context && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Contexto</span>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{term.context}"</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmDeleteTermId !== null}
        title="Eliminar palabra"
        message="¿Estás seguro de que deseas eliminar esta palabra del glosario permanentemente?"
        onConfirm={() => {
          if (confirmDeleteTermId) {
            onDeleteTerm(confirmDeleteTermId);
          }
          setConfirmDeleteTermId(null);
        }}
        onCancel={() => setConfirmDeleteTermId(null)}
      />
    </div>
  );
}
