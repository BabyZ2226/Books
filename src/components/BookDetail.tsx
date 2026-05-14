import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, BookOpen, Trash2, Edit3, Image as ImageIcon, Save, Plus, Star, BookText, GraduationCap, Sparkles, Loader2, Download, Mic, Square, Pause, Play, Send, Brain, MessageSquare, Zap, RotateCcw, BrainCircuit, Link2, ExternalLink, X, Maximize2, ChevronLeft, ChevronRight, List, LayoutGrid, FolderClosed, FolderOpen, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Glossary } from './Glossary';
import { BookStats } from './BookStats';
import { FlashcardQuiz } from './FlashcardQuiz';
import { ConfirmModal } from './ConfirmModal';
import { GoogleGenAI } from '@google/genai';
import { Book, Note, GlossaryTerm, Flashcard, ChatMessage, BookStatus, Insight, BookRecommendation } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  book: Book;
  notes: Note[];
  terms: GlossaryTerm[];
  onBack: () => void;
  onUpdateBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onSaveNote: (bookId: string, content: string, reference?: string, noteId?: string, relatedNoteIds?: string[], audioData?: string, audioStartTime?: number, audioEndTime?: number) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleNoteFavorite: (noteId: string) => void;
  onAddTerm: (term: Omit<GlossaryTerm, 'userId'>) => void;
  onDeleteTerm: (termId: string) => void;
}

const FlashcardItem = ({ card, onDelete }: { card: Flashcard, onDelete: () => void }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setIsRevealed(!isRevealed)}
      className={`bg-white dark:bg-gray-900 border cursor-pointer rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden min-h-[220px] flex flex-col justify-center ${isRevealed ? 'border-amber-100 dark:border-amber-500/20 ring-2 ring-amber-500/5 dark:ring-amber-500/10' : 'border-gray-100 dark:border-white/5'}`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        {!isRevealed ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="text-center"
          >
            <span className="text-[10px] uppercase font-black text-amber-500 tracking-[0.2em] mb-4 block">Flashcard de Estudio</span>
            <h4 className="font-display font-black text-gray-900 dark:text-white text-xl md:text-2xl leading-[1.2]">{card.question}</h4>
            <div className="mt-8 flex items-center justify-center gap-2 text-gray-300 dark:text-gray-600 group-hover:text-amber-500 transition-colors">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Toca para revelar</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="answer"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <span className="text-[10px] uppercase font-black text-green-500 tracking-[0.2em] mb-4 block">Respuesta Maestra</span>
            <p className="text-gray-700 dark:text-gray-300 font-serif italic text-lg leading-relaxed">{card.answer}</p>
            <button className="mt-8 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest hover:text-gray-500 dark:hover:text-gray-400">
              Volver a la pregunta
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function BookDetail({ book, notes, terms, onBack, onUpdateBook, onDeleteBook, onSaveNote, onDeleteNote, onToggleNoteFavorite, onAddTerm, onDeleteTerm }: Props) {
  const [activeTab, setActiveTab] = useState<'notes' | 'glossary' | 'flashcards' | 'chat' | 'insights' | 'recommendations'>('notes');
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [currentReference, setCurrentReference] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | undefined>();
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState(book.coverUrl || '');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(book.summary || '');
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isLinkingNoteId, setIsLinkingNoteId] = useState<string | null>(null);

  // Flashcards state
  const [flashcards, setFlashcards] = useLocalStorage<Flashcard[]>(`flashcards-${book.id}`, []);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  
  // Insights state
  const [insights, setInsights] = useLocalStorage<Insight[]>(`insights-${book.id}`, []);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  // Recommendations state
  const [recommendations, setRecommendations] = useLocalStorage<BookRecommendation[]>(`recommendations-${book.id}`, []);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useLocalStorage<ChatMessage[]>(`chat-history-${book.id}`, []);
  const [currentInput, setCurrentInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [pendingAudio, setPendingAudio] = useLocalStorage<string | null>(`pending-audio-${book.id}`, null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Resume pending audio processing on mount
  useEffect(() => {
    if (pendingAudio && !isProcessingAudio) {
      processAudio(pendingAudio);
    }
  }, []);

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const groupedNotesList = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    
    const filtered = notes.filter(note => {
      if (showFavoritesOnly) return note.isFavorite;
      return true;
    });

    filtered.forEach(note => {
      let chapter = "Reflexiones Generales";
      if (note.reference) {
        // Look for Chapter/Capítulo
        const chapterMatch = note.reference.match(/(?:Capítulo|Chapter)\s*(\d+|[IVXLCDM]+|[A-Z])(?:\s+.*)?/i) || 
                            note.reference.match(/(?:Cap\.)\s*(\d+)/i);
        
        if (chapterMatch) {
          chapter = chapterMatch[0].split(/[/,]/)[0].trim();
        } else {
          // If no chapter mentioned but has reference, maybe it's just "Pág X"
          // We'll group those together too
          const parts = note.reference.split(/[/,]/);
          if (parts[0].toLowerCase().includes('pág')) {
            chapter = "Por Páginas";
          } else {
            chapter = parts[0].trim();
          }
        }
      }
      if (!groups[chapter]) groups[chapter] = [];
      groups[chapter].push(note);
    });

    // Sort chapters: Try to extract number, Roman numeral, or just alpha
    const sortedChapters = Object.keys(groups).sort((a, b) => {
      if (a === "Reflexiones Generales") return 1;
      if (b === "Reflexiones Generales") return -1;
      
      const aNum = parseInt(a.match(/\d+/)?.[0] || "0");
      const bNum = parseInt(b.match(/\d+/)?.[0] || "0");
      
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });

    // Sort notes within chapters by page
    sortedChapters.forEach(ch => {
      groups[ch].sort((a, b) => {
        const aPage = parseInt(a.reference?.match(/(?:Pág\.?|Página|p)\s*(\d+)/i)?.[1] || "0");
        const bPage = parseInt(b.reference?.match(/(?:Pág\.?|Página|p)\s*(\d+)/i)?.[1] || "0");
        if (aPage !== bPage) return aPage - bPage;
        return b.createdAt - a.createdAt;
      });
    });

    return { chapters: sortedChapters, groups };
  }, [notes, showFavoritesOnly]);

  const toggleChapter = (chapter: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapter]: !prev[chapter]
    }));
  };

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.createdAt - a.createdAt;
  }), [notes]);

  const filteredNotes = sortedNotes.filter(note => {
    if (showFavoritesOnly) return note.isFavorite;
    return true;
  });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 1199) { // 20 minutes limit
            finishRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('No se pudo acceder al micrófono. Por favor, asegúrate de dar los permisos necesarios.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 1199) { // 20 minutes limit
            finishRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          resolve();
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        if (timerRef.current) window.clearInterval(timerRef.current);
      } else {
        resolve();
      }
    });
  };

  const finishRecording = async () => {
    await stopRecording();
    setShowAudioPreview(true);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setShowAudioPreview(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    chunksRef.current = [];
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleAudioImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Por favor, selecciona un archivo de audio válido.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      await processAudio(base64Audio);
    };
    // Reset input
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const processAudio = async (base64Audio: string) => {
    try {
      setIsProcessingAudio(true);
      setProcessingProgress(0);
      setProcessingPhase("Iniciando análisis neuronal...");
      setPendingAudio(base64Audio); // Persist immediately
      setShowAudioPreview(false);

      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 95) return prev;
          return prev + (prev < 50 ? 2 : 1);
        });
      }, 1000);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Actúa como un tutor literario de alto nivel especializado en adolescentes. He grabado un audio de hasta 20 minutos sobre el libro "${book.title}" de "${book.author}".
        
Tu tarea:
1. DIVISIÓN POR CAPÍTULOS Y PÁGINAS (CRÍTICO): Identifica CADA sección del audio donde hablo de un capítulo o página específica.
2. NOTAS INDEPENDIENTES: Crea una nota detallada para CADA una de estas secciones identificadas. Si hablo de 3 capítulos, crea 3 notas.
3. TIMESTAMPS: Identifica el segundo exacto de inicio y fin (en segundos desde el inicio del audio) para cada una de estas notas.
4. GLOSARIO PARA ADOLESCENTES: Extrae palabras o términos que puedan ser difíciles o desconocidos para un ADOLESCENTE (12-18 años), basándote en el audio y el contexto literario. Proporciona definiciones sencillas pero precisas.

Devuelve ÚNICAMENTE un JSON con este formato:
{
  "notes": [
    {
      "reference": "Capítulo X / Página Y",
      "content": "Contenido detallado en Markdown analizando esta sección específica",
      "startTime": 0,
      "endTime": 60
    }
  ],
  "glossaryItems": [
    { "word": "palabra", "definition": "explicación clara para un adolescente", "context": "fragmento donde se mencionó" }
  ]
}
Si no detectas una referencia clara a una página o capítulo, usa una descripción breve como "Análisis General" o "Reflexión Inicial".`;

      setProcessingPhase("Detectando referencias y páginas...");
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json'
        }
      });

      setProcessingPhase("Estructurando sabiduría...");
      const result = JSON.parse(response.text || '{}');
      
      // Save multiple notes if they exist
      if (result.notes && Array.isArray(result.notes)) {
        result.notes.forEach((noteData: any) => {
          onSaveNote(
            book.id, 
            noteData.content, 
            noteData.reference || undefined,
            undefined,
            undefined,
            base64Audio,
            noteData.startTime,
            noteData.endTime
          );
        });
      }

      // Save glossary terms if any
      if (result.glossaryItems && Array.isArray(result.glossaryItems)) {
        result.glossaryItems.forEach((item: any) => {
          onAddTerm({
            id: Math.random().toString(36).substr(2, 9),
            bookId: book.id,
            word: item.word,
            definition: item.definition,
            context: item.context,
            createdAt: Date.now()
          });
        });
      }

      clearInterval(progressInterval);
      setProcessingProgress(100);
      setProcessingPhase("¡Análisis completado!");
      setPendingAudio(null); // Clear buffer on success

      setTimeout(() => {
        setIsProcessingAudio(false);
        setProcessingProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Error processing audio with Gemini:', error);
      setProcessingPhase("Error en el análisis. Puedes reintentar.");
      setIsProcessingAudio(false);
    } finally {
      chunksRef.current = [];
    }
  };

  const handleSendAudio = async () => {
    if (showAudioPreview && !audioUrl) return;

    try {
      let audioBlob: Blob;
      if (audioUrl) {
        const response = await fetch(audioUrl);
        audioBlob = await response.blob();
      } else {
        await stopRecording();
        audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      }

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        await processAudio(base64Audio);
      };
    } catch (error) {
      console.error('Error reading audio blob:', error);
      setIsProcessingAudio(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Proporciona un breve resumen sin spoilers del libro "${book.title}" escrito por "${book.author}". Devuelve solo el texto del resumen, sin introducciones ni comillas.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      const summary = response.text || '';
      if (summary) {
        setSummaryText(summary);
        setIsEditingSummary(true);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Hubo un error al generar el resumen. Revisa la conexión o intenta más tarde.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExportMarkdown = () => {
    let md = `# ${book.title}\n**Autor:** ${book.author}\n**Estado:** ${book.status}\n`;
    if (book.totalPages) md += `**Progreso:** ${book.currentPage || 0} / ${book.totalPages} páginas\n`;
    md += `\n---\n\n`;

    if (book.summary) {
      md += `## Resumen\n\n${book.summary}\n\n---\n\n`;
    }

    if (notes.length > 0) {
      md += `## Notas\n\n`;
      notes.forEach(note => {
        if (note.reference) md += `**${note.reference}:**\n`;
        md += `${note.content}\n\n`;
      });
      md += `---\n\n`;
    }

    if (terms.length > 0) {
      md += `## Glosario\n\n`;
      terms.forEach(term => {
        md += `- **${term.word}:** ${term.definition}\n`;
        if (term.context) md += `  > *Contexto: "${term.context}"*\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}_Anotaciones.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateFlashcards = async () => {
    if (notes.length === 0) {
      alert("Añade algunas notas antes de generar flashcards.");
      return;
    }
    try {
      setIsGeneratingCards(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Basándote en estas notas del libro "${book.title}", genera 5 flashcards de estudio para un ADOLESCENTE (12-18 años) para reforzar el aprendizaje. Cada flashcard debe tener una Pregunta corta y una Respuesta clara pero explicada de forma sencilla. Devuelve estrictamente un JSON con formato: {"flashcards": [{"question": "...", "answer": "..."}]}. Notas:\n${notes.map(n => n.content).join('\n')}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.flashcards) {
        const newCards: Flashcard[] = result.flashcards.map((c: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          bookId: book.id,
          question: c.question,
          answer: c.answer,
          createdAt: Date.now()
        }));
        setFlashcards(prev => [...newCards, ...prev]);
      }
    } catch (error) {
      console.error('Error generating cards:', error);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (notes.length === 0) {
      alert("Añade algunas notas antes de revelar conexiones ocultas.");
      return;
    }
    try {
      setIsGeneratingInsights(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analiza profundamente las siguientes notas del libro "${book.title}" de ${book.author} pensando en un lector ADOLESCENTE.
Tu objetivo es encontrar 3 conexiones ocultas, patrones profundos, o revelaciones (insights) únicas explicadas de forma cautivadora para un joven. 
Cada insight debe pertenecer a una de estas categorías: 'connection' (conecta ideas del libro), 'epiphany' (una revelación filosófica o profunda) o 'application' (una aplicación revolucionaria a la vida real del adolescente).
Devuelve estrictamente un JSON con este formato exacto:
{
  "insights": [
    {
      "title": "Título corto y cautivador del insight",
      "description": "Explicación detallada y clara de la conexión o revelación descubierta.",
      "type": "connection" | "epiphany" | "application"
    }
  ]
}

Notas:
${notes.map(n => n.content).join('\n')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.insights) {
        const newInsights: Insight[] = result.insights.map((c: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          bookId: book.id,
          title: c.title,
          description: c.description,
          type: c.type,
          createdAt: Date.now()
        }));
        setInsights(newInsights); // Update all
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      setIsGeneratingRecommendations(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Basándote en el libro "${book.title}" de ${book.author}, sugiere 3 libros similares que sean clásicos de dominio público u obras de acceso libre/gratuito. Para cada uno, proporciona el título, autor, una breve razón de la recomendación, y un enlace directo a una fuente legítima gratuita (como Project Gutenberg o similar) si es posible.
Devuelve estrictamente un JSON con este formato exacto:
{
  "recommendations": [
    {
      "title": "Título del libro",
      "author": "Autor",
      "reason": "Por qué es una buena recomendación",
      "pdfUrl": "URL opcional al PDF gratuito o fuente"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.recommendations) {
        const newRecommendations: BookRecommendation[] = result.recommendations.map((c: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          bookId: book.id,
          title: c.title,
          author: c.author,
          reason: c.reason,
          pdfUrl: c.pdfUrl,
          createdAt: Date.now()
        }));
        setRecommendations(newRecommendations);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const handleChatSendMessage = async () => {
    if (!currentInput.trim() || isAiResponding) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: currentInput,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setCurrentInput('');
    setIsAiResponding(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Construct context from current book state
      const summaryContext = book.summary ? `Resumen: ${book.summary}` : "";
      const notesContext = notes.length > 0 ? `Notas del usuario: ${notes.map(n => n.content).join(' | ')}` : "";
      const context = `Contexto del libro "${book.title}" (${book.author}). ${summaryContext}. ${notesContext}.`;
      
      const prompt = `${context}\n\nPregunta del usuario: ${currentInput}\n\nResponde como un tutor literario experto y cercano, especializado en ADOLESCENTES. Usa un lenguaje claro, motivador y evita formalismos excesivos, ayudando al joven a conectar con la historia y profundizar en su lectura de forma amena.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: response.text || "Lo siento, no pude procesar tu pregunta.",
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsAiResponding(false);
    }
  };

  const openEditorForNew = () => {
    setCurrentNote('');
    setCurrentReference('');
    setEditingNoteId(undefined);
    setIsEditingNote(true);
  };

  const openEditorForEdit = (note: Note) => {
    setCurrentNote(note.content);
    setCurrentReference(note.reference || '');
    setEditingNoteId(note.id);
    setIsEditingNote(true);
  };

  const [isSavingNote, setIsSavingNote] = useState(false);

  const saveNote = async () => {
    if (!currentNote.trim()) return;
    setIsSavingNote(true);
    try {
      await onSaveNote(book.id, currentNote, currentReference.trim() || undefined, editingNoteId);
      setIsEditingNote(false);
      setCurrentNote('');
      setCurrentReference('');
      setEditingNoteId(undefined);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveSummary = () => {
    onUpdateBook({ ...book, summary: summaryText.trim() || undefined });
    setIsEditingSummary(false);
  };

  const handleToggleNoteRelation = (noteId: string, relatedId: string) => {
    const note = notes.find(n => n.id === noteId);
    const relatedNote = notes.find(n => n.id === relatedId);
    if (!note || !relatedNote) return;
    
    // Toggle first direction
    const currentRelatedArr = note.relatedNoteIds || [];
    const isRelated = currentRelatedArr.includes(relatedId);
    
    let newRelatedIds: string[];
    if (isRelated) {
      newRelatedIds = currentRelatedArr.filter(id => id !== relatedId);
    } else {
      newRelatedIds = [...currentRelatedArr, relatedId];
    }
    
    // Toggle second direction
    const otherRelatedArr = relatedNote.relatedNoteIds || [];
    const otherIsRelated = otherRelatedArr.includes(noteId);
    
    let otherNewRelatedIds: string[];
    if (otherIsRelated && isRelated) {
      otherNewRelatedIds = otherRelatedArr.filter(id => id !== noteId);
    } else if (!otherIsRelated && !isRelated) {
      otherNewRelatedIds = [...otherRelatedArr, noteId];
    } else {
      otherNewRelatedIds = otherRelatedArr;
    }

    // Save first note
    onSaveNote(book.id, note.content, note.reference, note.id, newRelatedIds);
    // Trigger second direction update
    onSaveNote(book.id, relatedNote.content, relatedNote.reference, relatedNote.id, otherNewRelatedIds);
  };

  const handleStatusChange = (status: BookStatus) => {
    onUpdateBook({ ...book, status });
  };

  const toggleStatus = () => {
    const statuses: BookStatus[] = ['Por leer', 'Leyendo', 'Terminado'];
    const nextIdx = (statuses.indexOf(book.status) + 1) % statuses.length;
    handleStatusChange(statuses[nextIdx]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto pb-24"
    >
      <motion.button 
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors group px-4 py-2 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-white/10"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium text-sm">Volver a la biblioteca</span>
      </motion.button>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 mb-12">
        <div className="w-full max-w-[240px] sm:max-w-xs mx-auto lg:mx-0 lg:w-56 shrink-0 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full aspect-[2/3] bg-gray-50 dark:bg-gray-800 rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative group"
            >
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={`Portada de ${book.title}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
                  <BookText size={48} className="mb-2 opacity-20" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Archivo Digital</span>
                </div>
              )}
            </motion.div>
          
          <div className="flex flex-col gap-3">
            {isEditingCover ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5"
              >
                <input
                  type="url"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="URL de la imagen"
                  className="w-full px-4 py-2.5 text-sm border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 outline-none bg-gray-50/50 dark:bg-black/20 dark:text-white"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingCover(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onUpdateBook({ ...book, coverUrl: newCoverUrl.trim() });
                      setIsEditingCover(false);
                    }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-gray-900 dark:bg-amber-500 text-white dark:text-black hover:bg-black dark:hover:bg-amber-600 transition-colors shadow-md"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => {
                  setNewCoverUrl(book.coverUrl || '');
                  setIsEditingCover(true);
                }}
                className="w-full py-3 px-4 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center space-x-2 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none"
              >
                <ImageIcon size={16} className="opacity-70" />
                <span>Editar portada</span>
              </button>
            )}

            <button
              onClick={toggleStatus}
              className={`w-full py-3 px-4 rounded-2xl text-sm font-black flex items-center justify-center space-x-3 transition-all border shadow-sm
                ${book.status === 'Terminado' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500 border-green-100 dark:border-green-500/20 hover:bg-green-100/50 dark:hover:bg-green-500/20' : 
                  book.status === 'Leyendo' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-100 dark:border-amber-500/20 hover:bg-amber-100/50 dark:hover:bg-amber-500/20' : 
                  'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-green-500/20 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${book.status === 'Terminado' ? 'bg-green-500' : book.status === 'Leyendo' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
              <span>{book.status}</span>
            </button>

            {book.totalPages && book.totalPages > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 mb-3 font-black uppercase tracking-[0.1em]">
                  <span>Progreso</span>
                  <span className="text-gray-900 dark:text-white">{book.currentPage || 0} / {book.totalPages} pág</span>
                </div>
                <div className="w-full h-2 bg-gray-50 dark:bg-white/5 rounded-full overflow-hidden mb-4 border border-gray-100/50 dark:border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, ((book.currentPage || 0) / book.totalPages) * 100))}%` }}
                    className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={book.totalPages}
                    value={book.currentPage || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        onUpdateBook({ ...book, currentPage: Math.min(book.totalPages!, Math.max(0, val)) });
                      } else if (e.target.value === '') {
                         onUpdateBook({ ...book, currentPage: 0 });
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-100 dark:border-white/10 rounded-[1.25rem] bg-gray-50/50 dark:bg-white/5 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all outline-none font-bold text-gray-700 dark:text-gray-300"
                    placeholder="Pág actual"
                  />
                  <BookOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600" />
                </div>
              </div>
            )}

            <button 
              onClick={() => setConfirmDeleteBook(true)}
              className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-gray-300 hover:text-red-500 transition-all flex items-center justify-center space-x-2"
            >
              <Trash2 size={16} />
              <span>Eliminar este libro</span>
            </button>
          </div>
        </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-7xl font-display font-black text-gray-900 dark:text-white mb-4 leading-[1] tracking-tighter"
              >
                {book.title}
              </motion.h1>
              <div className="flex flex-wrap items-center gap-6">
                <p className="text-xl text-gray-400 dark:text-gray-500 font-serif italic">{book.author}</p>
                {book.genre && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-500/20">
                    {book.genre}
                  </span>
                )}
                {book.tags && book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-gray-100 dark:border-white/10">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {book.rating && (
                  <div className="flex gap-1 ml-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={16} 
                        className={star <= book.rating! ? 'text-amber-500' : 'text-gray-200 dark:text-gray-800'} 
                        fill={star <= book.rating! ? 'currentColor' : 'none'} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary || !!book.summary}
              className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-[2rem] text-sm font-black transition-all shadow-xl group border-2 ${
                book.summary 
                ? 'bg-white dark:bg-white/5 text-green-600 dark:text-green-500 border-green-50 dark:border-green-500/20 shadow-green-100/20 dark:shadow-none' 
                : 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black border-transparent hover:bg-black dark:hover:bg-amber-600 shadow-gray-200/50 dark:shadow-none'
              }`}
            >
              {isGeneratingSummary ? (
                <Loader2 size={20} className="animate-spin" />
              ) : book.summary ? (
                <Sparkles size={20} className="text-green-500" />
              ) : (
                <Zap size={20} className="text-amber-400 group-hover:animate-pulse" />
              )}
              <span>{book.summary ? 'Resumen IA Listo' : 'Generar Resumen IA'}</span>
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {isEditingSummary ? (
              <motion.div 
                key="edit-summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-6 shadow-xl"
              >
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Escribe un breve resumen de qué trata el libro..."
                  className="w-full h-40 p-4 text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-white/10 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:bg-white dark:focus:bg-gray-800 resize-none mb-4 transition-all"
                  autoFocus
                />
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="flex items-center gap-2 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-4 py-2 rounded-xl transition-all text-sm font-bold disabled:opacity-50"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Generando sabiduría...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Regenerar con IA</span>
                      </>
                    )}
                  </button>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setIsEditingSummary(false);
                        setSummaryText(book.summary || '');
                      }}
                      className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-transparent rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveSummary}
                      className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-black text-white dark:text-black bg-gray-900 dark:bg-amber-500 rounded-xl hover:bg-black dark:hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="view-summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-10 group relative"
              >
                {book.summary ? (
                  <div onClick={() => setIsEditingSummary(true)} className="cursor-text bg-amber-50/30 dark:bg-amber-500/5 p-6 rounded-[2rem] border border-amber-100/50 dark:border-amber-500/10 hover:bg-amber-100/20 dark:hover:bg-amber-500/10 transition-all">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl font-serif text-lg italic">{book.summary}</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 border-dashed">
                    <p className="text-gray-400 dark:text-gray-500 text-sm font-serif italic">No hay resumen todavía...</p>
                    <button
                      onClick={() => setIsEditingSummary(true)}
                      className="flex items-center gap-2 text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors text-sm font-black"
                    >
                      <Edit3 size={16} />
                      <span>Escribir manualmente</span>
                    </button>
                  </div>
                )}
                {book.summary && (
                  <div className="absolute -right-3 -top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => {
                        navigator.clipboard.writeText(book.summary || '');
                        alert('Resumen copiado al portapapeles');
                      }}
                      className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-500 border border-gray-100 dark:border-white/10 rounded-xl shadow-xl transition-all"
                      title="Copiar resumen"
                    >
                      <Download size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setIsEditingSummary(true)}
                      className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-500 border border-gray-100 dark:border-white/10 rounded-xl shadow-xl transition-all"
                      title="Editar resumen"
                    >
                      <Edit3 size={16} />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 md:gap-8 pb-1 mb-8 border-b border-gray-100 dark:border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-4 text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all relative whitespace-nowrap px-2 ${activeTab === 'notes' ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <div className="flex items-center space-x-2">
                <BookText size={16} />
                <span>Notas</span>
              </div>
              {activeTab === 'notes' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('glossary')}
              className={`pb-4 text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all relative whitespace-nowrap px-2 ${activeTab === 'glossary' ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <div className="flex items-center space-x-2">
                <GraduationCap size={16} />
                <span>Glosario</span>
              </div>
              {activeTab === 'glossary' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`pb-4 text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all relative whitespace-nowrap px-2 ${activeTab === 'flashcards' ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <div className="flex items-center space-x-2">
                <Brain size={16} />
                <span>Estudio</span>
              </div>
              {activeTab === 'flashcards' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`pb-4 text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all relative whitespace-nowrap px-2 ${activeTab === 'insights' ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <div className="flex items-center space-x-2">
                <Zap size={16} />
                <span>Conexiones</span>
              </div>
              {activeTab === 'insights' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`pb-4 text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all relative whitespace-nowrap px-2 ${activeTab === 'recommendations' ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen size={16} />
                <span>Recomendaciones</span>
              </div>
              {activeTab === 'recommendations' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-4 text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all relative whitespace-nowrap px-2 ${activeTab === 'chat' ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare size={16} />
                <span>Tutor</span>
              </div>
              {activeTab === 'chat' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
            
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleExportMarkdown}
                className="p-3 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/10"
                title="Exportar libro a Markdown"
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isRecording && (
              <motion.div 
                key="recording-ui"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center p-8 backdrop-blur-3xl"
              >
                  <div className="flex flex-col items-center gap-8 md:gap-10">
                  <div className="flex justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1] }} 
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]" 
                    />
                  </div>
                  
                  <div className="text-6xl sm:text-7xl md:text-8xl font-mono font-black text-white tracking-widest tabular-nums font-bold">
                    {formatTime(recordingTime)}
                  </div>

                  <div className="flex items-center gap-6 md:gap-8 mt-4">
                    <button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    >
                      {isPaused ? <Play size={32} className="md:w-10 md:h-10" fill="currentColor" /> : <Pause size={32} className="md:w-10 md:h-10" fill="currentColor" />}
                    </button>

                    <button
                      onClick={finishRecording}
                      className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-black rounded-full transition-all shadow-xl shadow-amber-500/20"
                    >
                      <Square size={32} className="md:w-10 md:h-10" fill="currentColor" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isRecording && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 md:relative md:bottom-auto md:left-auto md:translate-x-0 md:w-full md:max-w-none md:mb-10">
              <div className="bg-gray-900/95 backdrop-blur-xl p-3 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-3 border border-white/10">
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key="actions-ui"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 w-full"
                    >
                      {showAudioPreview && audioUrl ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/10 px-6 py-4 rounded-[1.75rem] w-full border border-white/10">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                              <Play size={20} className="text-black ml-0.5" />
                            </div>
                            <audio src={audioUrl} controls className="h-10 w-full sm:w-48 filter grayscale invert opacity-70 dark:opacity-90" />
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                            <button
                              onClick={() => {
                                setShowAudioPreview(false);
                                if (audioUrl) URL.revokeObjectURL(audioUrl);
                                setAudioUrl(null);
                              }}
                              className="flex-1 sm:flex-none p-3 text-white/50 hover:text-white transition-colors"
                              title="Descartar y volver a grabar"
                            >
                              <RotateCcw size={20} />
                            </button>
                            <button
                              onClick={handleSendAudio}
                              className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                            >
                              Confirmar y Analizar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 flex gap-2">
                            <button
                              onClick={startRecording}
                              disabled={isProcessingAudio}
                              className="flex-1 flex items-center justify-center space-x-3 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-[1.75rem] text-[10px] font-black transition-all border border-white/5 active:scale-95 uppercase tracking-widest"
                            >
                              {isProcessingAudio ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Mic size={18} className="text-amber-400" />
                              )}
                              <span>{isProcessingAudio ? 'PROCESANDO...' : 'GRABAR NOTA'}</span>
                            </button>

                            <button
                              onClick={() => audioInputRef.current?.click()}
                              disabled={isProcessingAudio}
                              className="hidden sm:flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-[1.75rem] text-[10px] font-black transition-all border border-white/5 active:scale-95 uppercase tracking-widest"
                              title="Importar archivo de audio"
                            >
                              <Download size={18} className="text-blue-400" />
                              <span>Importar</span>
                            </button>
                            <input
                              type="file"
                              ref={audioInputRef}
                              onChange={handleAudioImport}
                              accept="audio/*"
                              className="hidden"
                            />
                          </div>

                          {activeTab === 'notes' && !isEditingNote && (
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={openEditorForNew}
                              className="flex items-center justify-center p-4 bg-white dark:bg-amber-500 text-black rounded-[1.75rem] shadow-xl hover:bg-amber-50 dark:hover:bg-amber-400 transition-all"
                            >
                              <Plus size={24} />
                            </motion.button>
                          )}
                        </>
                      )}
                      
                      <button
                        onClick={handleExportMarkdown}
                        className="md:hidden flex items-center justify-center p-4 bg-white/10 text-white rounded-[1.75rem] border border-white/5 active:scale-95"
                      >
                        <Download size={24} />
                      </button>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'notes' ? (
              <motion.div 
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight uppercase">Notas de Sabiduría</h2>
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                      <button
                        onClick={() => setShowFavoritesOnly(false)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!showFavoritesOnly ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                      >
                        Todas
                      </button>
                      <button
                        onClick={() => setShowFavoritesOnly(true)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showFavoritesOnly ? 'bg-white dark:bg-gray-800 text-amber-500 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                      >
                        Favoritas
                      </button>
                    </div>
                  </div>
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl ml-auto sm:ml-0 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>

                {pendingAudio && !isProcessingAudio && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 bg-amber-50 rounded-[2.5rem] border-2 border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                        <Sparkles size={24} className="text-black" />
                      </div>
                      <div>
                        <h4 className="font-serif font-black text-amber-900 text-lg">Sesión Pendiente Detectada</h4>
                        <p className="text-amber-700 text-xs">Parece que una grabación no terminó de procesarse. ¿Quieres analizarla ahora?</p>
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button 
                        onClick={() => setPendingAudio(null)}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-900/50 hover:text-amber-900"
                      >
                        Descartar
                      </button>
                      <button 
                        onClick={() => processAudio(pendingAudio)}
                        className="px-6 py-3 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/10"
                      >
                        Procesar Audio
                      </button>
                    </div>
                  </motion.div>
                )}

                {isProcessingAudio && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-10 p-8 bg-gray-900 rounded-[2.5rem] border border-white/10 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                      <motion.div 
                        className="h-full bg-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${processingProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                        className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                      >
                        <BrainCircuit size={32} className="text-black" />
                      </motion.div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-white font-serif font-black text-xl">Extrayendo Sabiduría...</h3>
                          <span className="text-amber-500 font-mono font-black">{processingProgress}%</span>
                        </div>
                        <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.2em]">
                          {processingPhase}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isEditingNote && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mb-8 overflow-hidden"
                  >
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 px-2 border-b border-gray-100 dark:border-white/5 mb-2 focus-within:border-amber-200 dark:focus-within:border-amber-500/50 transition-colors">
                        <BookOpen size={16} className="text-amber-500/70" />
                        <input
                          type="text"
                          value={currentReference}
                          onChange={(e) => setCurrentReference(e.target.value)}
                          placeholder="Referencia (ej. Capítulo 1, Pág. 45)..."
                          className="w-full py-2 outline-none text-sm font-medium text-amber-700 dark:text-amber-500 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        />
                      </div>
                      <textarea
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        placeholder="Escribe tus ideas aquí... (soporta formato Markdown)"
                        className="w-full h-40 resize-none outline-none text-gray-800 dark:text-gray-200 leading-relaxed p-2 bg-transparent"
                        autoFocus
                      />
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <span className="text-xs text-gray-400 dark:text-gray-600">Puedes usar Markdown para formatear.</span>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => setIsEditingNote(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={saveNote}
                            disabled={isSavingNote}
                            className="flex items-center space-x-2 bg-gray-900 dark:bg-amber-500 hover:bg-gray-800 dark:hover:bg-amber-600 text-white dark:text-black px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                          >
                            {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>{isSavingNote ? 'Guardando...' : (editingNoteId ? 'Actualizar' : 'Guardar')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-6">
                  {groupedNotesList.chapters.length === 0 && !isEditingNote && (
                    <div className="text-center py-12 px-6 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50 dark:bg-white/5">
                      <p className="text-gray-500 dark:text-gray-400 mb-2">
                        {showFavoritesOnly ? "No hay notas favoritas aún." : "Aún no has escrito notas para este libro."}
                      </p>
                      {!showFavoritesOnly && (
                        <button 
                          onClick={openEditorForNew}
                          className="text-amber-600 dark:text-amber-500 font-medium hover:text-amber-700 dark:hover:text-amber-400"
                        >
                          Escribe tu primera anotación
                        </button>
                      )}
                    </div>
                  )}
                  
                  {groupedNotesList.chapters.map(chapter => (
                    <div key={chapter} className="space-y-4">
                      <button
                        onClick={() => toggleChapter(chapter)}
                        className={`w-full flex items-center justify-between p-5 rounded-[2.5rem] border transition-all group ${expandedChapters[chapter] ? 'bg-amber-500 border-amber-400 shadow-xl shadow-amber-500/10' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-amber-500/30 shadow-sm'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl transition-all ${expandedChapters[chapter] ? 'bg-white text-black' : 'bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-amber-500'}`}>
                            {expandedChapters[chapter] ? <FolderOpen size={24} /> : <FolderClosed size={24} />}
                          </div>
                          <div className="flex flex-col items-start">
                            <h3 className={`font-display font-black uppercase tracking-tight text-lg ${expandedChapters[chapter] ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{chapter}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${expandedChapters[chapter] ? 'text-black/60' : 'text-gray-400'}`}>
                              {groupedNotesList.groups[chapter].length} {groupedNotesList.groups[chapter].length === 1 ? 'Idea' : 'Ideas'} grabadas
                            </span>
                          </div>
                        </div>
                        <div className={`transition-all duration-500 p-2 rounded-full ${expandedChapters[chapter] ? 'bg-black/10 rotate-180' : 'bg-gray-50 dark:bg-white/5'}`}>
                          <ChevronDown size={20} className={expandedChapters[chapter] ? 'text-black' : 'text-gray-400'} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedChapters[chapter] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={viewMode === 'grid' ? "columns-1 md:columns-2 gap-6 space-y-6 md:space-y-0 pt-2" : "space-y-6 pt-2"}>
                              {groupedNotesList.groups[chapter].map(note => (
                                <motion.div 
                                  key={note.id}
                                  id={`note-${note.id}`}
                                  layout
                                  className={`bg-white dark:bg-gray-900 p-6 rounded-2xl border transition-all group relative break-inside-avoid ${viewMode === 'grid' ? 'mb-6 md:mb-6 mt-0 inline-block w-full' : ''} ${isLinkingNoteId === note.id ? 'border-amber-500 ring-2 ring-amber-500/10 dark:ring-amber-500/20' : 'border-gray-100 dark:border-white/5 shadow-sm dark:shadow-none'}`}
                                >
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest font-sans">
                                        {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(note.createdAt)}
                                      </span>
                                      {note.reference && (
                                        <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 dark:border-amber-500/20">
                                          {note.reference}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex space-x-2 items-center">
                                      {isLinkingNoteId && isLinkingNoteId !== note.id && (
                                        <motion.button
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => {
                                            handleToggleNoteRelation(isLinkingNoteId, note.id);
                                            setIsLinkingNoteId(null);
                                          }}
                                          className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20"
                                        >
                                          <Link2 size={12} />
                                          Vincular Idea
                                        </motion.button>
                                      )}
                                      
                                      {isLinkingNoteId === note.id && (
                                        <button 
                                          onClick={() => setIsLinkingNoteId(null)}
                                          className="text-red-500 text-[10px] font-black uppercase tracking-widest"
                                        >
                                          Cancelar conexión
                                        </button>
                                      )}

                                      {!isLinkingNoteId && (
                                        <button 
                                          onClick={() => setIsLinkingNoteId(note.id)}
                                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Relacionar con otra nota"
                                        >
                                          <Link2 size={18} />
                                        </button>
                                      )}

                                      <button 
                                        onClick={() => onToggleNoteFavorite(note.id)}
                                        className={`p-2 md:p-1.5 rounded-md transition-colors ${note.isFavorite ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}
                                        title={note.isFavorite ? "Quitar de favoritos" : "Marcar como importante"}
                                      >
                                        <Star size={18} fill={note.isFavorite ? "currentColor" : "none"} />
                                      </button>
                                      <div className="flex space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity pl-1 border-l border-gray-100 dark:border-white/10">
                                        <button 
                                          onClick={() => openEditorForEdit(note)}
                                          className="p-2 md:p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-md transition-colors"
                                          title="Editar"
                                        >
                                          <Edit3 size={16} />
                                        </button>
                                        <button 
                                          onClick={() => setConfirmDeleteNoteId(note.id)}
                                          className="p-2 md:p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                                          title="Eliminar"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="prose prose-sm md:prose-base dark:prose-invert prose-amber max-w-none text-gray-700 dark:text-gray-300 font-serif leading-relaxed mb-4">
                                    <ReactMarkdown>{note.content}</ReactMarkdown>
                                  </div>

                                  {note.audioData && (
                                    <div className="mb-4 bg-gray-50 dark:bg-black/20 rounded-2xl p-3 border border-gray-100 dark:border-white/5 flex flex-col gap-2">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                                          <Play size={14} className="text-black ml-0.5" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Audio {note.audioStartTime !== undefined ? 'del Fragmento' : 'de la Sesión'}</span>
                                          {note.audioStartTime !== undefined && (
                                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-500">
                                              Segmento: {formatTime(note.audioStartTime)} - {note.audioEndTime !== undefined ? formatTime(note.audioEndTime) : '??'}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <audio 
                                        onPlay={(e) => {
                                          const audio = e.currentTarget;
                                          if (note.audioStartTime !== undefined) {
                                            audio.currentTime = note.audioStartTime;
                                          }
                                        }}
                                        onTimeUpdate={(e) => {
                                          const audio = e.currentTarget;
                                          if (note.audioEndTime !== undefined && audio.currentTime >= note.audioEndTime) {
                                            audio.pause();
                                            audio.currentTime = note.audioStartTime || 0;
                                          }
                                        }}
                                        src={`data:audio/webm;base64,${note.audioData}`} 
                                        controls 
                                        className="h-8 w-full filter grayscale invert opacity-60 dark:opacity-80" 
                                      />
                                    </div>
                                  )}

                                  {note.relatedNoteIds && note.relatedNoteIds.length > 0 && (
                                    <div className="pt-4 border-t border-gray-50 dark:border-white/5 mt-4">
                                      <span className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest mb-3 block">Ideas Relacionadas</span>
                                      <div className="flex flex-wrap gap-2">
                                        {note.relatedNoteIds.map(relId => {
                                          const relNote = notes.find(n => n.id === relId);
                                          if (!relNote) return null;
                                          return (
                                            <button
                                              key={relId}
                                              onClick={() => {
                                                const element = document.getElementById(`note-${relId}`);
                                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              }}
                                              className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/10 hover:border-amber-100 dark:hover:border-amber-500/20 transition-all text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]"
                                            >
                                              <ExternalLink size={12} className="text-amber-500" />
                                              <span className="truncate">{relNote.content.substring(0, 30)}...</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : activeTab === 'glossary' ? (
              <motion.div 
                key="glossary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Glossary bookId={book.id} terms={terms} onAddTerm={onAddTerm} onDeleteTerm={onDeleteTerm} />
              </motion.div>
            ) : activeTab === 'flashcards' ? (
              <motion.div
                key="flashcards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-8 rounded-[2.5rem] border border-white/5 gap-6 mb-10 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
                  <div className="text-center md:text-left relative z-10">
                    <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tight">SABIDURÍA DE ESTUDIO</h3>
                    <p className="text-sm text-gray-400 font-serif italic max-w-xs">IA entrenada para extraer los conceptos clave y ponerte a prueba.</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 relative z-10 w-full md:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGenerateFlashcards}
                      disabled={isGeneratingCards}
                      className="flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-black px-10 py-4 rounded-2xl text-xs font-black transition-all shadow-xl shadow-amber-500/20 uppercase tracking-[0.2em] disabled:opacity-50"
                    >
                      {isGeneratingCards ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Brain size={18} />
                      )}
                      <span>{isGeneratingCards ? 'Conectando...' : 'Generar Baraja'}</span>
                    </motion.button>
                    
                    {flashcards.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsQuizMode(true)}
                        className="flex items-center gap-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-100 dark:border-white/10 px-10 py-4 rounded-2xl text-xs font-black transition-all shadow-xl dark:shadow-none uppercase tracking-[0.2em]"
                      >
                        <Zap size={18} className="text-amber-500" />
                        <span>Sesión de Estudio</span>
                      </motion.button>
                    )}
                  </div>
                </div>

                {flashcards.length === 0 ? (
                  <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl dark:shadow-none">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Zap size={36} className="text-amber-500" />
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 font-serif italic text-lg max-w-sm mx-auto leading-relaxed">
                      "Aprender sin reflexionar es malgastar la energía."
                    </p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest mt-4">Toca el botón superior para empezar</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {flashcards.map(card => (
                      <FlashcardItem 
                        key={card.id} 
                        card={card} 
                        onDelete={() => setFlashcards(prev => prev.filter(c => c.id !== card.id))} 
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'insights' ? (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-8 rounded-[2.5rem] border border-white/5 gap-6 mb-10 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
                  <div className="text-center md:text-left relative z-10">
                    <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tight">Conexiones Ocultas</h3>
                    <p className="text-gray-400 font-serif italic max-w-lg">
                      La IA analizará tus notas para encontrar patrones profundos, relaciones ocultas y revelaciones sorprendentes sobre el libro.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={isGeneratingInsights}
                    className="relative z-10 w-full md:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-white/30 text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-500/20 disabled:shadow-none flex items-center justify-center space-x-3 active:scale-95"
                  >
                    {isGeneratingInsights ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Zap size={18} />
                    )}
                    <span>{isGeneratingInsights ? 'Analizando...' : 'Revelar Conexiones'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {insights.map((insight) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -5 }}
                      onClick={() => {
                        setCurrentInput(`Háblame más sobre este insight: "${insight.title}". ${insight.description}`);
                        setActiveTab('chat');
                      }}
                      className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col items-start gap-4 relative overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-all"
                    >
                      <div className={`p-4 rounded-3xl mb-2 text-white shadow-lg transition-transform group-hover:scale-110 ${insight.type === 'epiphany' ? 'bg-amber-500 shadow-amber-500/20' : insight.type === 'application' ? 'bg-green-500 shadow-green-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
                        {insight.type === 'epiphany' ? <Sparkles size={24} /> : insight.type === 'application' ? <Link2 size={24} /> : <Zap size={24} />}
                      </div>
                      <h4 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">{insight.title}</h4>
                      <p className="text-gray-600 dark:text-gray-400 font-serif leading-relaxed text-sm md:text-base">
                         {insight.description}
                      </p>
                      <div className="mt-auto pt-4 flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Preguntar al Tutor</span>
                        <ArrowRight size={12} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : activeTab === 'recommendations' ? (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-8 rounded-[2.5rem] border border-white/5 gap-6 mb-10 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
                  <div className="text-center md:text-left relative z-10">
                    <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tight">Recomendaciones</h3>
                    <p className="text-gray-400 font-serif italic max-w-lg">
                      Basado en tu lectura actual, aquí tienes otras lecturas que podrían expandir tu horizonte (y algunas son gratuitas).
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateRecommendations}
                    disabled={isGeneratingRecommendations}
                    className="relative z-10 w-full md:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-white/30 text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-500/20 disabled:shadow-none flex items-center justify-center space-x-3 active:scale-95"
                  >
                    {isGeneratingRecommendations ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <BookOpen size={18} />
                    )}
                    <span>{isGeneratingRecommendations ? 'Generando...' : 'Obtener Recomendaciones'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.map((rec) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col items-start gap-4 relative overflow-hidden"
                    >
                      <h4 className="text-xl font-display font-black text-gray-900 dark:text-white">{rec.title}</h4>
                      <p className="text-gray-500 dark:text-gray-500 font-black uppercase text-[10px] tracking-widest">{rec.author}</p>
                      <p className="text-gray-600 dark:text-gray-400 font-serif leading-relaxed text-sm md:text-base">
                         {rec.reason}
                      </p>
                      {rec.pdfUrl && (
                        <a href={rec.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-4 text-amber-600 dark:text-amber-500 font-bold text-xs uppercase tracking-widest hover:underline">
                          <ExternalLink size={14} />
                          Leer PDF / Fuente
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col h-[500px] md:h-[650px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl dark:shadow-none"
              >
                <div className="p-6 border-b border-gray-50 dark:border-white/5 bg-white dark:bg-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 dark:shadow-none">
                      <BrainCircuit size={22} className="text-black" />
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-gray-900 dark:text-white text-lg leading-none">Tutor Sabio IA</h3>
                      <span className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        En línea ahora
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setChatMessages([])} 
                    className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                    title="Limpiar chat"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/10 dark:bg-black/20 no-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-20 px-8">
                      <div className="w-28 h-28 bg-white dark:bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-xl border border-gray-50 dark:border-white/5 dark:shadow-none">
                        <Sparkles size={48} className="text-amber-500" />
                      </div>
                      <h4 className="font-display font-black text-gray-900 dark:text-white text-3xl mb-4 tracking-tighter">¿QUÉ QUIERES DESCUBRIR?</h4>
                      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto font-serif italic leading-relaxed">
                        "El conocimiento es la única riqueza que los tiranos no pueden confiscar."
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] shadow-xl dark:shadow-none ${
                        msg.role === 'user' 
                        ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-tr-none' 
                        : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-tl-none'
                      }`}>
                        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed text-inherit font-serif">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isAiResponding && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 px-6 py-5 rounded-[2rem] rounded-tl-none shadow-xl dark:shadow-none flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-white/5">
                  <div className="flex gap-3 relative">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSendMessage()}
                      placeholder="Pregúntame sobre el libro..."
                      className="flex-1 pl-6 pr-14 py-5 bg-gray-50/50 dark:bg-black/20 border border-transparent dark:border-white/10 rounded-[1.75rem] text-sm outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 dark:focus:border-amber-500/50 transition-all font-serif dark:text-white"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleChatSendMessage}
                      disabled={!currentInput.trim() || isAiResponding}
                      className="absolute right-2 top-2 bottom-2 aspect-square bg-gray-900 dark:bg-amber-500 hover:bg-black dark:hover:bg-amber-600 text-white dark:text-black rounded-2xl shadow-xl dark:shadow-none transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center group"
                    >
                      <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </motion.button>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="h-px w-8 bg-gray-100 dark:bg-white/5" />
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 font-black uppercase tracking-[0.2em]">IA de Estudio Inteligente</p>
                    <div className="h-px w-8 bg-gray-100 dark:bg-white/5" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      <ConfirmModal
        isOpen={confirmDeleteBook}
        title="Eliminar libro"
        message="¿Estás seguro de que deseas eliminar este libro? Se perderán permanentemente todas tus notas y palabras del glosario asociadas."
        onConfirm={() => {
          setConfirmDeleteBook(false);
          onDeleteBook(book.id);
          onBack();
        }}
        onCancel={() => setConfirmDeleteBook(false)}
      />

      <ConfirmModal
        isOpen={confirmDeleteNoteId !== null}
        title="Eliminar nota"
        message="¿Estás seguro de que deseas eliminar esta nota permanentemente? Esta acción no se puede deshacer."
        onConfirm={() => {
          if (confirmDeleteNoteId) {
            onDeleteNote(confirmDeleteNoteId);
          }
          setConfirmDeleteNoteId(null);
        }}
        onCancel={() => setConfirmDeleteNoteId(null)}
      />

      {isQuizMode && (
        <FlashcardQuiz 
          flashcards={flashcards} 
          onClose={() => setIsQuizMode(false)} 
        />
      )}
    </motion.div>
  );
}
