import React, { useState, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Book, Note, GlossaryTerm } from './types';
import { BookCard } from './components/BookCard';
import { BookDetail } from './components/BookDetail';
import { AddBookModal } from './components/AddBookModal';
import { motion, AnimatePresence } from 'motion/react';
import { BookMarked, Plus, Search, Clock, Calendar, User, Type, ArrowUp, ArrowDown } from 'lucide-react';

type SortOption = 'title' | 'author' | 'addedAt' | 'lastUpdated';

export default function App() {
  const [books, setBooks] = useLocalStorage<Book[]>('biblionotas-books', []);
  const [notes, setNotes] = useLocalStorage<Note[]>('biblionotas-notes', []);
  const [terms, setTerms] = useLocalStorage<GlossaryTerm[]>('biblionotas-terms', []);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('biblionotas-dark-mode', false);
  
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortBy, setSortBy] = useState<SortOption>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleAddBook = (newBookData: Omit<Book, 'id' | 'addedAt'>) => {
    const newBook: Book = {
      ...newBookData,
      id: crypto.randomUUID(),
      addedAt: Date.now(),
    };
    setBooks(prev => [newBook, ...prev]);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(prev => prev.map(book => book.id === updatedBook.id ? updatedBook : book));
  };

  const handleDeleteBook = (id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id));
    // Also cleanup notes and terms
    setNotes(prev => prev.filter(note => note.bookId !== id));
    setTerms(prev => prev.filter(term => term.bookId !== id));
  };

  const handleSaveNote = (bookId: string, content: string, reference?: string, noteId?: string, relatedNoteIds?: string[], audioData?: string, audioStartTime?: number, audioEndTime?: number) => {
    if (noteId) {
      setNotes(prev => prev.map(note => {
        if (note.id === noteId) {
          const updatedNote: Note = { ...note, content, reference, updatedAt: Date.now() };
          if (relatedNoteIds !== undefined) {
            updatedNote.relatedNoteIds = relatedNoteIds;
          }
          if (audioData !== undefined) {
            updatedNote.audioData = audioData;
          }
          if (audioStartTime !== undefined) {
            updatedNote.audioStartTime = audioStartTime;
          }
          if (audioEndTime !== undefined) {
            updatedNote.audioEndTime = audioEndTime;
          }
          return updatedNote;
        }
        return note;
      }));
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        bookId,
        content,
        reference,
        relatedNoteIds,
        audioData,
        audioStartTime,
        audioEndTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes(prev => [...prev, newNote]);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const handleToggleNoteFavorite = (id: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
    ));
  };

  const handleAddTerm = (term: GlossaryTerm) => {
    setTerms(prev => [term, ...prev]);
  };

  const handleDeleteTerm = (id: string) => {
    setTerms(prev => prev.filter(t => t.id !== id));
  };

  const selectedBook = selectedBookId ? books.find(b => b.id === selectedBookId) : null;

  const filteredAndSortedBooks = useMemo(() => {
    let result = books.filter(b => 
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.author.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLastUpdated = (bookId: string) => {
      const bookNotes = notes.filter(n => n.bookId === bookId);
      if (bookNotes.length === 0) {
        const book = books.find(b => b.id === bookId);
        return book ? book.addedAt : 0;
      }
      return Math.max(...bookNotes.map(n => n.updatedAt));
    };

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = a.author.localeCompare(b.author);
          break;
        case 'addedAt':
          comparison = a.addedAt - b.addedAt;
          break;
        case 'lastUpdated':
          comparison = getLastUpdated(a.id) - getLastUpdated(b.id);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [books, notes, searchTerm, sortBy, sortOrder]);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-[#f9f7f5] dark:bg-gray-950 dark:text-gray-100 transition-colors duration-500">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-gray-100/30 dark:bg-gray-950/70 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setSelectedBookId(null)}
          >
            <div className="bg-gray-900 dark:bg-amber-500 text-white dark:text-black p-2.5 rounded-2xl group-hover:rotate-12 transition-transform duration-500 shadow-xl shadow-gray-200 dark:shadow-none">
              <BookMarked size={24} />
            </div>
            <h1 className="text-3xl font-display font-black tracking-tighter uppercase dark:text-white leading-none">BIBLIO<span className="text-amber-500 dark:text-white/40">NOTAS</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-600 dark:text-amber-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {isDarkMode ? (
                <motion.div
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                >
                  <Clock size={18} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                >
                  <Clock size={18} />
                </motion.div>
              )}
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-white bg-gray-900 px-6 py-3 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-300/50 dark:bg-amber-500 dark:text-black dark:shadow-amber-500/10"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nuevo Libro</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <AnimatePresence mode="wait">
          {selectedBook ? (
            <BookDetail
              key="detail"
              book={selectedBook}
              notes={notes.filter(n => n.bookId === selectedBook.id)}
              terms={terms.filter(t => t.bookId === selectedBook.id)}
              onBack={() => setSelectedBookId(null)}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onToggleNoteFavorite={handleToggleNoteFavorite}
              onAddTerm={handleAddTerm}
              onDeleteTerm={handleDeleteTerm}
            />
          ) : (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col mb-12 gap-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-4xl md:text-7xl font-display font-black text-gray-900 dark:text-white mb-4 tracking-tighter leading-none">BIBLIOTECA</h2>
                    <p className="text-lg md:text-xl text-gray-400 font-serif italic">{books.length} {books.length === 1 ? 'libro' : 'obras'} en tu archivo digital</p>
                  </div>
                </div>
                
                {books.length > 0 && (
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 mt-4 flex flex-col xl:flex-row gap-6 shadow-2xl shadow-gray-100/50 dark:shadow-none">
                    <div className="relative w-full xl:w-1/3">
                      <input
                        type="text"
                        placeholder="Buscar en el archivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-6 py-4 pl-14 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-[1.75rem] text-sm outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-serif italic dark:text-white"
                      />
                      <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 justify-end">
                      <div className="flex items-center gap-2 bg-gray-50/80 dark:bg-white/5 p-2 rounded-[1.75rem] border border-gray-100 dark:border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                          { id: 'lastUpdated', label: 'Evolución', icon: Clock },
                          { id: 'addedAt', label: 'Recientes', icon: Calendar },
                          { id: 'title', label: 'Alfabético', icon: Type },
                          { id: 'author', label: 'Autoría', icon: User }
                        ].map((option) => (
                          <button 
                            key={option.id}
                            onClick={() => setSortBy(option.id as SortOption)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${sortBy === option.id ? 'bg-white dark:bg-white/10 shadow-xl dark:shadow-none text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <option.icon size={14} />
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-4 text-gray-400 hover:text-amber-600 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-[1.75rem] transition-all shadow-lg active:scale-90"
                        title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                      >
                        {sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {books.length === 0 ? (
                <div className="text-center py-20 px-4 bg-white/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookMarked size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-white mb-2">Tu biblioteca está vacía</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">Comienza a construir tu colección digital. Añade los libros que estás leyendo para guardar tus mejores ideas y anotaciones.</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center space-x-2 bg-gray-900 dark:bg-amber-500 hover:bg-gray-800 dark:hover:bg-amber-600 text-white dark:text-black px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    <Plus size={18} />
                    <span>Añadir mi primer libro</span>
                  </button>
                </div>
              ) : filteredAndSortedBooks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No se encontraron libros que coincidan con tu búsqueda.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 sm:gap-x-8 gap-y-8 sm:gap-y-12 pt-4">
                  {filteredAndSortedBooks.map(book => (
                    <BookCard key={book.id} book={book} onClick={setSelectedBookId} onDelete={handleDeleteBook} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AddBookModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAddBook={handleAddBook} 
      />
    </div>
  );
}
