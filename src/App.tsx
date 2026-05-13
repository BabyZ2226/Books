import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Book, Note, GlossaryTerm, BookRecommendation } from './types';
import { BookCard } from './components/BookCard';
import { BookDetail } from './components/BookDetail';
import { AddBookModal } from './components/AddBookModal';
import { RecommendationModal } from './components/RecommendationModal';
import { CategoryBrowser } from './components/CategoryBrowser';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { BookMarked, Plus, Search, Clock, Calendar, User, Type, ArrowUp, ArrowDown, BookOpen, Loader2, ExternalLink, Zap, ArrowRight, LogOut } from 'lucide-react';
import { useBiblionotasData } from './lib/useBiblionotasData';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LoginScreen } from './components/LoginScreen';

const OPEN_LIBRARY_CATEGORIES = [
  { name: 'Tendencias Globales', query: 'fiction' },
  { name: 'Clásicos Imperdibles', query: 'classic' },
  { name: 'Misterio y Suspenso', query: 'mystery' },
  { name: 'Ciencia Ficción y Fantasía', query: 'fantasy' },
  { name: 'Desarrollo Personal', query: 'self_help' },
  { name: 'Romance', query: 'romance' },
  { name: 'Historia y Eventos', query: 'history' },
  { name: 'Biografía y Memorias', query: 'biography' },
  { name: 'Emprendimiento y Negocios', query: 'business' },
  { name: 'Poesía', query: 'poetry' }
];

type SortOption = 'title' | 'author' | 'addedAt' | 'lastUpdated';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f9f7f5] dark:bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={48} /></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <BiblionotasApp />;
}

function BiblionotasApp() {
  const { books, notes, terms, loading, addOrUpdateBook, deleteBook, addOrUpdateNote, deleteNote, addOrUpdateTerm, deleteTerm } = useBiblionotasData();
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('biblionotas-dark-mode', false);
  const [recommendations, setRecommendations] = useLocalStorage<BookRecommendation[]>('biblionotas-recommendations', []);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<BookRecommendation | null>(null);
  const [recommendationGenre, setRecommendationGenre] = useState<string>('Todos');
  
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [browsingCategory, setBrowsingCategory] = useState<{name: string, query: string} | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortBy, setSortBy] = useState<SortOption>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredRecommendations = useMemo(() => {
    if (recommendationGenre === 'Todos') return recommendations;
    return recommendations.filter(r => (r.genre || 'General') === recommendationGenre);
  }, [recommendations, recommendationGenre]);

  const genres = useMemo(() => {
    const list = Array.from(new Set(recommendations.map(r => r.genre || 'General').filter(Boolean))) as string[];
    return ['Todos', ...list];
  }, [recommendations]);

  const handleAddBook = (newBookData: Omit<Book, 'id' | 'addedAt' | 'userId'>) => {
    const newBook: Book = {
      ...newBookData,
      id: crypto.randomUUID(),
      userId: auth.currentUser!.uid,
      addedAt: Date.now(),
    };
    addOrUpdateBook(newBook);
  };

  const handleGenerateRecommendations = async () => {
    try {
      setIsGeneratingRecommendations(true);
      setRecommendations([]); // Clear old state
      
      const newRecommendations: BookRecommendation[] = [];

      for (const cat of OPEN_LIBRARY_CATEGORIES) {
        try {
          const response = await fetch(`https://openlibrary.org/subjects/${cat.query}.json?limit=10`);
          const data = await response.json();
          
          if (data.works) {
            for (const item of data.works) {
              // Avoid duplicates
              if (!newRecommendations.find(r => r.title === item.title)) {
                const coverUrl = item.cover_id 
                  ? `https://covers.openlibrary.org/b/id/${item.cover_id}-M.jpg` 
                  : (item.cover_edition_key ? `https://covers.openlibrary.org/b/olid/${item.cover_edition_key}-M.jpg` : '');

                newRecommendations.push({
                  id: crypto.randomUUID(),
                  bookId: item.key,
                  title: item.title || 'Desconocido',
                  author: item.authors ? item.authors.map((a: any) => a.name).join(', ') : 'Autor Anónimo',
                  reason: `Destacado en ${cat.name}`,
                  pdfUrl: `https://openlibrary.org${item.key}`,
                  description: 'Explora este título en Open Library.',
                  coverUrl: coverUrl || 'https://via.placeholder.com/128x192.png?text=Sin+Portada',
                  genre: cat.name,
                  createdAt: Date.now()
                });
              }
            }
          }
        } catch (catError) {
          console.error(`Error fetching category ${cat.name}:`, catError);
        }
      }
      
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  // Trigger automatically on load if empty
  React.useEffect(() => {
    // Fetch if we don't have recommendations and aren't already generating
    if (recommendations.length === 0 && !isGeneratingRecommendations) {
      handleGenerateRecommendations();
    }
  }, []); // Only run on mount

  const handleAddRecommendation = (rec: BookRecommendation) => {
    handleAddBook({
      title: rec.title,
      author: rec.author,
      summary: rec.description,
      coverUrl: rec.coverUrl,
      status: 'Por leer'
    });
    setSelectedRecommendation(null);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    addOrUpdateBook(updatedBook);
  };

  const handleDeleteBook = (id: string) => {
    deleteBook(id);
  };

  const handleSaveNote = (bookId: string, content: string, reference?: string, noteId?: string, relatedNoteIds?: string[], audioData?: string, audioStartTime?: number, audioEndTime?: number) => {
    if (noteId) {
      const existing = notes.find(n => n.id === noteId);
      if (existing) {
        const updatedNote: Note = { ...existing, content, reference, updatedAt: Date.now() };
        if (relatedNoteIds !== undefined) updatedNote.relatedNoteIds = relatedNoteIds;
        if (audioData !== undefined) updatedNote.audioData = audioData;
        if (audioStartTime !== undefined) updatedNote.audioStartTime = audioStartTime;
        if (audioEndTime !== undefined) updatedNote.audioEndTime = audioEndTime;
        addOrUpdateNote(updatedNote);
      }
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        userId: auth.currentUser!.uid,
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
      addOrUpdateNote(newNote);
    }
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
  };

  const handleToggleNoteFavorite = (id: string) => {
    const existing = notes.find(n => n.id === id);
    if (existing) {
      addOrUpdateNote({ ...existing, isFavorite: !existing.isFavorite });
    }
  };

  const handleAddTerm = (termData: Omit<GlossaryTerm, 'userId'>) => {
    addOrUpdateTerm({
      ...termData,
      userId: auth.currentUser!.uid
    });
  };

  const handleDeleteTerm = (id: string) => {
    deleteTerm(id);
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f9f7f5] dark:bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={48} /></div>;
  }

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
                onClick={() => auth.signOut()}
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-all group"
                title="Cerrar sesión"
              >
                <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
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
          {browsingCategory ? (
            <CategoryBrowser
              key="browser"
              category={browsingCategory}
              onBack={() => setBrowsingCategory(null)}
              onSelectBook={setSelectedRecommendation}
            />
          ) : selectedBook ? (
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

              <div className="mt-20">
                <div className="mb-10">
                  <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Clasificaciones Populares</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-serif italic max-w-lg">
                    {isGeneratingRecommendations ? 'Cargando recomendaciones...' : 'Descubre los títulos más populares clasificados para ti.'}
                  </p>
                </div>

                {isGeneratingRecommendations ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 size={32} className="animate-spin text-amber-500" />
                    <p className="text-gray-400 font-serif italic">Buscando las mejores lecturas para ti...</p>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-12">
                  {genres.filter(g => g !== 'Todos').map(genre => (
                    <div key={genre} className="space-y-4">
                      <h4 className="text-xl font-display font-black text-gray-900 dark:text-white px-4">{genre}</h4>
                      <div className="flex gap-4 overflow-x-auto pb-6 px-4 no-scrollbar">
                        {recommendations.filter(r => (r.genre || 'General') === genre).map(rec => (
                          <motion.button
                            key={rec.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedRecommendation(rec)}
                            className="aspect-[2/3] w-32 md:w-40 flex-shrink-0 rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/10 relative group bg-gray-100 dark:bg-gray-800"
                          >
                            {rec.coverUrl ? (
                              <img src={rec.coverUrl} alt={rec.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                                <BookMarked size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                              </div>
                            )}
                          </motion.button>
                        ))}
                        {(() => {
                          const categoryObj = OPEN_LIBRARY_CATEGORIES.find(c => c.name === genre);
                          if (!categoryObj) return null;
                          return (
                            <button
                              onClick={() => setBrowsingCategory(categoryObj)}
                              className="aspect-[2/3] w-32 md:w-40 flex-shrink-0 rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/10 relative group bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors no-underline"
                            >
                               <div className="rounded-full bg-gray-200 dark:bg-gray-700 p-3 mb-3 group-hover:scale-110 transition-transform flex items-center justify-center shadow-sm">
                                  <ArrowRight size={24} className="text-gray-600 dark:text-gray-300" />
                               </div>
                               <span className="font-semibold text-gray-700 dark:text-gray-300 block text-sm">Ver más</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    No se pudieron cargar recomendaciones, intenta recargar la página.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <RecommendationModal 
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
          onAdd={handleAddRecommendation}
        />
      </main>

      <AddBookModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAddBook={handleAddBook} 
      />
    </div>
  );
}
