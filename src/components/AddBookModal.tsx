import React, { useState, useEffect, useRef } from 'react';
import { Book, BookStatus } from '../types';
import { X, Search, Book as BookIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (book: Omit<Book, 'id' | 'addedAt' | 'userId'>) => void;
}

interface ExternalBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
}

export function AddBookModal({ isOpen, onClose, onAddBook }: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  
  // Manual Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<BookStatus>('Por leer');
  const [totalPages, setTotalPages] = useState<number | ''>('');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExternalBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setActiveTab('search');
      setTitle('');
      setAuthor('');
      setCoverUrl('');
      setStatus('Por leer');
      setTotalPages('');
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab !== 'search') return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=ebook&limit=8`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const results: ExternalBook[] = data.results.map((item: any) => ({
            id: item.trackId.toString(),
            title: item.trackName || 'Título desconocido',
            author: item.artistName || 'Autor desconocido',
            coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : ''
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error searching books:', error);
        setSearchError('Hubo un problema al buscar los libros. Por favor, intenta de nuevo o usa la entrada manual.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 800); // Aumentado a 800ms para evitar demasiadas peticiones mientras se escribe

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    onAddBook({
      title: title.trim(),
      author: author.trim(),
      coverUrl: coverUrl.trim(),
      status,
      ...(totalPages !== '' && !isNaN(totalPages) && totalPages > 0 ? { totalPages: Number(totalPages) } : {})
    });

    onClose();
  };

  const handleSelectBook = (book: ExternalBook) => {
    setTitle(book.title);
    setAuthor(book.author);
    setCoverUrl(book.coverUrl);
    setActiveTab('manual');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative z-10"
        >
          <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-white/5 shrink-0">
            <div>
              <h2 className="text-2xl font-serif font-black text-gray-900 dark:text-white leading-none">Nueva Adquisición</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mt-2">Registra tu próxima aventura</p>
            </div>
            <button onClick={onClose} className="p-3 -mr-2 text-gray-300 hover:text-gray-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex bg-gray-50/50 dark:bg-white/5 p-2 m-4 rounded-[1.75rem] shrink-0">
            <button
              className={`flex-1 py-3 px-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'search' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xl dark:shadow-none' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('search')}
            >
              Archivo Global
            </button>
            <button
              className={`flex-1 py-3 px-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xl dark:shadow-none' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('manual')}
            >
              Registro Manual
            </button>
          </div>

          <div className="overflow-y-auto no-scrollbar">
            {activeTab === 'search' ? (
              <div className="p-8 space-y-6 pt-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Busca por título o autor..."
                    className="w-full pl-14 pr-4 py-5 bg-gray-50/50 dark:bg-white/5 border border-transparent rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-serif italic dark:text-white"
                    autoFocus
                  />
                  <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                  {isSearching && (
                    <Loader2 size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" />
                  )}
                </div>

                <div className="space-y-3">
                  {!isSearching && searchQuery.trim() && searchResults.length === 0 && !searchError && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-gray-200 dark:text-gray-700" />
                      </div>
                      <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Sin resultados</p>
                    </div>
                  )}
                  
                  {searchError && (
                    <p className="text-xs text-center text-red-500 py-6 px-4 bg-red-50 dark:bg-red-950/30 rounded-[1.5rem] font-serif italic">{searchError}</p>
                  )}
                  
                  {searchResults.map((book) => (
                    <motion.button
                      key={book.id}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectBook(book)}
                      className="w-full flex items-center gap-4 p-4 text-left border border-transparent hover:border-gray-100 dark:hover:border-white/5 rounded-[1.75rem] hover:bg-white dark:hover:bg-white/5 hover:shadow-2xl dark:hover:shadow-none transition-all group"
                    >
                      <div className="w-14 h-20 bg-gray-50 dark:bg-gray-800 rounded-xl shrink-0 overflow-hidden shadow-lg flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookIcon size={24} className="text-gray-200 dark:text-gray-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-600 transition-colors">{book.title}</h4>
                        <p className="text-sm text-gray-400 font-serif italic dark:text-gray-500">{book.author}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6">
                <div>
                  <label htmlFor="title" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Título de la Obra</label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50/50 dark:bg-white/5 border border-transparent rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-serif italic dark:text-white"
                    placeholder="Ej. El túnel"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="author" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Autoría</label>
                  <input
                    id="author"
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50/50 dark:bg-white/5 border border-transparent rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-serif italic dark:text-white"
                    placeholder="Ej. Ernesto Sabato"
                  />
                </div>

                <div>
                  <label htmlFor="coverUrl" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Iconografía (URL)</label>
                  <input
                    id="coverUrl"
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50/50 dark:bg-white/5 border border-transparent rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-serif italic dark:text-white"
                    placeholder="https://ejemplo.com/portada.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="status" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Estado</label>
                    <div className="relative">
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as BookStatus)}
                        className="w-full px-6 py-4 bg-gray-50/50 dark:bg-white/5 border border-transparent rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all appearance-none font-serif italic dark:text-white"
                      >
                        <option value="Por leer">Por leer</option>
                        <option value="Leyendo">Leyendo</option>
                        <option value="Terminado">Terminado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="totalPages" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Extensión</label>
                    <input
                      id="totalPages"
                      type="number"
                      min="1"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-6 py-4 bg-gray-50/50 dark:bg-white/5 border border-transparent rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-serif italic dark:text-white"
                      placeholder="Páginas"
                    />
                  </div>
                </div>

                <div className="pt-4 pb-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-5 px-8 bg-gray-900 dark:bg-amber-500 hover:bg-black dark:hover:bg-amber-600 text-white dark:text-black text-xs font-black uppercase tracking-[0.2em] rounded-[1.75rem] transition-all shadow-2xl shadow-gray-200 dark:shadow-none"
                  >
                    Guardar en archivo
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
