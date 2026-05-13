import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookMarked, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookRecommendation } from '../types';

interface CategoryBrowserProps {
  category: { name: string; query: string };
  onBack: () => void;
  onSelectBook: (book: BookRecommendation) => void;
}

export const CategoryBrowser: React.FC<CategoryBrowserProps> = ({ category, onBack, onSelectBook }) => {
  const [books, setBooks] = useState<BookRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      try {
        const offset = page * itemsPerPage;
        const response = await fetch(`https://openlibrary.org/subjects/${category.query}.json?limit=${itemsPerPage}&offset=${offset}`);
        const data = await response.json();
        
        if (data.works) {
          const fetchedBooks: BookRecommendation[] = data.works.map((item: any) => {
            const coverUrl = item.cover_id 
              ? `https://covers.openlibrary.org/b/id/${item.cover_id}-L.jpg` 
              : (item.cover_edition_key ? `https://covers.openlibrary.org/b/olid/${item.cover_edition_key}-L.jpg` : '');

            return {
              id: crypto.randomUUID(),
              bookId: item.key,
              title: item.title || 'Desconocido',
              author: item.authors ? item.authors.map((a: any) => a.name).join(', ') : 'Autor Anónimo',
              reason: `Destacado en ${category.name}`,
              pdfUrl: `https://openlibrary.org${item.key}`,
              description: 'Explora este título en Open Library.',
              coverUrl: coverUrl || 'https://via.placeholder.com/256x384.png?text=Sin+Portada',
              genre: category.name,
              createdAt: Date.now()
            };
          });
          setBooks(fetchedBooks);
        }
      } catch (error) {
        console.error('Error fetching category books:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [category, page]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="md:pt-8"
    >
      <button 
        onClick={onBack}
        className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        Volver a Inicio
      </button>

      <div className="mb-10">
        <h2 className="text-4xl md:text-5xl font-display font-black text-gray-900 dark:text-white mb-4 tracking-tight uppercase">
          {category.name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-serif italic text-lg max-w-2xl">
          Explora todos los títulos disponibles en esta categoría.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={40} className="animate-spin text-amber-500" />
          <p className="text-gray-400 font-serif italic">Buscando libros...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {books.map(rec => (
              <motion.button
                key={rec.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectBook(rec)}
                className="aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/10 relative group bg-gray-100 dark:bg-gray-800"
              >
                {rec.coverUrl ? (
                  <img src={rec.coverUrl} alt={rec.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                    <BookMarked size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-left">
                  <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight">{rec.title}</h3>
                  <p className="text-white/80 text-xs mt-1 line-clamp-1">{rec.author}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-12 flex justify-center items-center gap-6 border-t border-gray-100 dark:border-white/10 pt-8">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-200 dark:border-white/20 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
            >
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} /> Anterior
              </div>
            </button>
            <span className="text-gray-500 font-serif italic">
              Página {page + 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-gray-200 dark:border-white/20 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300"
            >
              <div className="flex items-center gap-2">
                Siguiente <ChevronRight size={18} />
              </div>
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};
