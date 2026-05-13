import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { BookMarked, Loader2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error && (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user')) {
        // User closed the popup, silently ignore so they can click again
        setIsLoggingIn(false);
        return;
      }
      console.error('Error logging in:', error);
      setErrorMsg('Ocurrió un error al iniciar sesión. Por favor, intenta de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#f9f7f5] dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/5 max-w-md w-full text-center">
        <div className="bg-gray-900 dark:bg-amber-500 text-white dark:text-black p-4 rounded-2xl inline-block mb-6 shadow-xl shadow-gray-200 dark:shadow-none">
          <BookMarked size={48} />
        </div>
        <h1 className="text-4xl font-display font-black tracking-tighter uppercase dark:text-white mb-2">BIBLIO<span className="text-amber-500">NOTAS</span></h1>
        <p className="text-gray-500 dark:text-gray-400 font-serif mb-8">
          Inicia sesión para guardar tu biblioteca, notas y glosario en la nube y acceder desde cualquier dispositivo.
        </p>
        
        {errorMsg && (
          <div className="mb-4 text-red-500 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {errorMsg}
          </div>
        )}
        
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="flex items-center justify-center space-x-3 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-6 py-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          )}
          <span>{isLoggingIn ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}</span>
        </button>
      </div>
    </div>
  );
};
