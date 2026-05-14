import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Book, Note, GlossaryTerm, Flashcard, Insight, ChatMessage } from '../types';
import { handleFirestoreError, OperationType } from './firestore_error';

export function useBiblionotasData() {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [booksLoaded, setBooksLoaded] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [termsLoaded, setTermsLoaded] = useState(false);
  const [flashcardsLoaded, setFlashcardsLoaded] = useState(false);
  const [insightsLoaded, setInsightsLoaded] = useState(false);
  const [chatMessagesLoaded, setChatMessagesLoaded] = useState(false);

  const loading = !booksLoaded || !notesLoaded || !termsLoaded || !flashcardsLoaded || !insightsLoaded || !chatMessagesLoaded;

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      setBooks([]);
      setNotes([]);
      setTerms([]);
      setFlashcards([]);
      setInsights([]);
      setChatMessages([]);
      setBooksLoaded(true);
      setNotesLoaded(true);
      setTermsLoaded(true);
      setFlashcardsLoaded(true);
      setInsightsLoaded(true);
      setChatMessagesLoaded(true);
      return;
    }

    const userId = auth.currentUser.uid;
    
    setBooksLoaded(false);
    setNotesLoaded(false);
    setTermsLoaded(false);
    setFlashcardsLoaded(false);
    setInsightsLoaded(false);
    setChatMessagesLoaded(false);

    const qBooks = query(collection(db, 'books'), where('userId', '==', userId));
    const unsubBooks = onSnapshot(qBooks, (snapshot) => {
      const b: Book[] = [];
      snapshot.forEach((doc) => b.push({ ...doc.data() as Book, id: doc.id }));
      setBooks(b);
      setBooksLoaded(true);
    }, (error) => {
      setBooksLoaded(true);
      if (!auth.currentUser) return;
      try { handleFirestoreError(error, OperationType.GET, 'books'); } catch (e) { console.error(e); }
    });

    const qNotes = query(collection(db, 'notes'), where('userId', '==', userId));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      const n: Note[] = [];
      snapshot.forEach((doc) => n.push({ ...doc.data() as Note, id: doc.id }));
      setNotes(n);
      setNotesLoaded(true);
    }, (error) => {
      setNotesLoaded(true);
      if (!auth.currentUser) return;
      try { handleFirestoreError(error, OperationType.GET, 'notes'); } catch (e) { console.error(e); }
    });

    const qTerms = query(collection(db, 'terms'), where('userId', '==', userId));
    const unsubTerms = onSnapshot(qTerms, (snapshot) => {
      const t: GlossaryTerm[] = [];
      snapshot.forEach((doc) => t.push({ ...doc.data() as GlossaryTerm, id: doc.id }));
      setTerms(t);
      setTermsLoaded(true);
    }, (error) => {
      setTermsLoaded(true);
      if (!auth.currentUser) return;
      try { handleFirestoreError(error, OperationType.GET, 'terms'); } catch (e) { console.error(e); }
    });

    const qFlashcards = query(collection(db, 'flashcards'), where('userId', '==', userId));
    const unsubFlashcards = onSnapshot(qFlashcards, (snapshot) => {
      const f: Flashcard[] = [];
      snapshot.forEach((doc) => f.push({ ...doc.data() as Flashcard, id: doc.id }));
      setFlashcards(f);
      setFlashcardsLoaded(true);
    }, (error) => {
      setFlashcardsLoaded(true);
      if (!auth.currentUser) return;
      try { handleFirestoreError(error, OperationType.GET, 'flashcards'); } catch (e) { console.error(e); }
    });

    const qInsights = query(collection(db, 'insights'), where('userId', '==', userId));
    const unsubInsights = onSnapshot(qInsights, (snapshot) => {
      const i: Insight[] = [];
      snapshot.forEach((doc) => i.push({ ...doc.data() as Insight, id: doc.id }));
      setInsights(i);
      setInsightsLoaded(true);
    }, (error) => {
      setInsightsLoaded(true);
      if (!auth.currentUser) return;
      try { handleFirestoreError(error, OperationType.GET, 'insights'); } catch (e) { console.error(e); }
    });

    const qChat = query(collection(db, 'chat_messages'), where('userId', '==', userId));
    const unsubChat = onSnapshot(qChat, (snapshot) => {
      const m: (ChatMessage & { id: string, bookId: string })[] = [];
      snapshot.forEach((doc) => m.push({ ...doc.data() as any, id: doc.id }));
      // Sort messages by timestamp
      m.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(m as any);
      setChatMessagesLoaded(true);
    }, (error) => {
      setChatMessagesLoaded(true);
      if (!auth.currentUser) return;
      try { handleFirestoreError(error, OperationType.GET, 'chat_messages'); } catch (e) { console.error(e); }
    });

    return () => {
      unsubBooks();
      unsubNotes();
      unsubTerms();
      unsubFlashcards();
      unsubInsights();
      unsubChat();
    };
  }, [auth.currentUser]);

  const sanitizeForFirestore = (obj: any) => {
    const sanitized = { ...obj };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    return sanitized;
  };

  const addOrUpdateBook = async (book: Book) => {
    try {
      if (!book.userId) book.userId = auth.currentUser!.uid;
      await setDoc(doc(db, 'books', book.id), sanitizeForFirestore(book));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'books');
    }
  };

  const deleteBook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'books', id));
      // Try to clean up associated data
      notes.filter(n => n.bookId === id).forEach(n => deleteDoc(doc(db, 'notes', n.id)));
      terms.filter(t => t.bookId === id).forEach(t => deleteDoc(doc(db, 'terms', t.id)));
      flashcards.filter(f => f.bookId === id).forEach(f => deleteDoc(doc(db, 'flashcards', f.id)));
      insights.filter(i => i.bookId === id).forEach(i => deleteDoc(doc(db, 'insights', i.id)));
      chatMessages.filter((m: any) => m.bookId === id).forEach((m: any) => deleteDoc(doc(db, 'chat_messages', m.id)));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'books');
    }
  };

  const addOrUpdateNote = async (note: Note) => {
    try {
      if (!note.userId) note.userId = auth.currentUser!.uid;
      
      if (note.audioData) {
        const audioSize = note.audioData.length;
        if (audioSize > 950000) { 
          throw new Error("El audio seleccionado es demasiado extenso para guardarse en la nube. Intenta con fragmentos más cortos (máximo ~5-8 minutos si quieres conservar el audio para escucha posterior).");
        }
      }

      await setDoc(doc(db, 'notes', note.id), sanitizeForFirestore(note));
    } catch (e) {
      if (e instanceof Error && e.message.includes("audio es demasiado grande")) {
        alert(e.message);
      }
      handleFirestoreError(e, OperationType.WRITE, 'notes');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'notes');
    }
  };

  const addOrUpdateTerm = async (term: GlossaryTerm) => {
    try {
      if (!term.userId) term.userId = auth.currentUser!.uid;
      await setDoc(doc(db, 'terms', term.id), sanitizeForFirestore(term));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'terms');
    }
  };

  const deleteTerm = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'terms', id));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'terms');
    }
  };

  const addOrUpdateFlashcard = async (card: Flashcard) => {
    try {
      if (!card.userId) card.userId = auth.currentUser!.uid;
      await setDoc(doc(db, 'flashcards', card.id), sanitizeForFirestore(card));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'flashcards');
    }
  };

  const deleteFlashcard = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'flashcards', id));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'flashcards');
    }
  };

  const addOrUpdateInsight = async (insight: Insight) => {
    try {
      if (!insight.userId) insight.userId = auth.currentUser!.uid;
      await setDoc(doc(db, 'insights', insight.id), sanitizeForFirestore(insight));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'insights');
    }
  };

  const deleteInsight = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'insights', id));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'insights');
    }
  };

  const addChatMessage = async (bookId: string, message: ChatMessage) => {
    try {
      const userId = auth.currentUser!.uid;
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'chat_messages', id), {
        ...message,
        id,
        userId,
        bookId
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'chat_messages');
    }
  };

  const clearChatMessages = async (bookId: string) => {
    try {
      const messagesToDelete = chatMessages.filter((m: any) => m.bookId === bookId);
      for (const m of messagesToDelete) {
        await deleteDoc(doc(db, 'chat_messages', (m as any).id));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'chat_messages');
    }
  };

  return {
    books,
    notes,
    terms,
    flashcards,
    insights,
    chatMessages,
    loading,
    addOrUpdateBook,
    deleteBook,
    addOrUpdateNote,
    deleteNote,
    addOrUpdateTerm,
    deleteTerm,
    addOrUpdateFlashcard,
    deleteFlashcard,
    addOrUpdateInsight,
    deleteInsight,
    addChatMessage,
    clearChatMessages
  };
}
