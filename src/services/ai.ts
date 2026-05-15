import { GoogleGenAI } from "@google/genai";

/**
 * Obtiene la mejor API Key disponible:
 * 1. La que el usuario guardó en Settings (LocalStorage)
 * 2. La que viene de las variables de entorno (GitHub Secrets)
 */
export function getGeminiApiKey(): string {
  const userKey = localStorage.getItem('user-gemini-api-key');
  if (userKey && userKey.trim() !== '') {
    return userKey.trim();
  }
  
  // Usamos acceso directo para que Vite lo reemplace vía 'define'
  const envKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '';
  if (envKey) return envKey;

  // Fallback a VITE_ prefix
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

/**
 * Inicializa el cliente de Gemini con la llave correcta
 */
export function getAIClient() {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Modelo por defecto para tareas de texto básicas
export const DEFAULT_TEXT_MODEL = 'gemini-3-flash-preview';
