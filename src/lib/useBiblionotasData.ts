import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Book, Note, GlossaryTerm } from '../types';
import { handleFirestoreError, OperationType } from './firestore_error';

export function useBiblionotasData() {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  
  const [booksLoaded, setBooksLoaded] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [termsLoaded, setTermsLoaded] = useState(false);

  const loading = !booksLoaded || !notesLoaded || !termsLoaded;

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
      setBooksLoaded(true);
      setNotesLoaded(true);
      setTermsLoaded(true);
      return;
    }

    const userId = auth.currentUser.uid;
    
    setBooksLoaded(false);
    setNotesLoaded(false);
    setTermsLoaded(false);

    const qBooks = query(collection(db, 'books'), where('userId', '==', userId));
    const unsubBooks = onSnapshot(qBooks, (snapshot) => {
      const b: Book[] = [];
      snapshot.forEach((doc) => b.push(doc.data() as Book));
      setBooks(b);
      setBooksLoaded(true);
    }, (error) => {
      setBooksLoaded(true);
      if (!auth.currentUser) return;
      try {
        handleFirestoreError(error, OperationType.GET, 'books');
      } catch (e) {
        console.error(e);
      }
    });

    const qNotes = query(collection(db, 'notes'), where('userId', '==', userId));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      const n: Note[] = [];
      snapshot.forEach((doc) => n.push(doc.data() as Note));
      setNotes(n);
      setNotesLoaded(true);
    }, (error) => {
      setNotesLoaded(true);
      if (!auth.currentUser) return;
      try {
        handleFirestoreError(error, OperationType.GET, 'notes');
      } catch (e) {
        console.error(e);
      }
    });

    const qTerms = query(collection(db, 'terms'), where('userId', '==', userId));
    const unsubTerms = onSnapshot(qTerms, (snapshot) => {
      const t: GlossaryTerm[] = [];
      snapshot.forEach((doc) => t.push(doc.data() as GlossaryTerm));
      setTerms(t);
      setTermsLoaded(true);
    }, (error) => {
      setTermsLoaded(true);
      if (!auth.currentUser) return;
      try {
        handleFirestoreError(error, OperationType.GET, 'terms');
      } catch (e) {
        console.error(e);
      }
    });

    return () => {
      unsubBooks();
      unsubNotes();
      unsubTerms();
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
      // Try to clean up notes and terms (ideally in a batch)
      notes.filter(n => n.bookId === id).forEach(n => deleteDoc(doc(db, 'notes', n.id)));
      terms.filter(t => t.bookId === id).forEach(t => deleteDoc(doc(db, 'terms', t.id)));
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'books');
    }
  };

  const addOrUpdateNote = async (note: Note) => {
    try {
      if (!note.userId) note.userId = auth.currentUser!.uid;
      
      // Validation for Firestore document size (1MB limit)
      // Base64 increases size by ~33%. content can also be large.
      if (note.audioData) {
        const audioSize = note.audioData.length;
        if (audioSize > 800000) { // ~800KB limit for audio string
          throw new Error("El audio es demasiado grande para guardarse en la nube. Intenta con fragmentos más cortos.");
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

  return {
    books,
    notes,
    terms,
    loading,
    addOrUpdateBook,
    deleteBook,
    addOrUpdateNote,
    deleteNote,
    addOrUpdateTerm,
    deleteTerm
  };
}
