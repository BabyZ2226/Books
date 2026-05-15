import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Shield, AlertCircle, Save, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('user-gemini-api-key');
    if (savedKey) setApiKey(savedKey);
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('user-gemini-api-key', apiKey);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden"
          >
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-500">
                    <Key size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">AJUSTES</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-serif italic">Configura tu cerebro artificial</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Gemini API Key
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Ingresa tu llave de Google AI Studio..."
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-[1.5rem] font-serif outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all dark:text-white"
                    />
                    <Key size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                  <p className="text-[11px] text-gray-400 font-serif leading-relaxed px-2">
                    Tu llave se guarda localmente en tu navegador y nunca se envía a otro servidor. 
                    Puedes obtener una gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Google AI Studio</a>.
                  </p>
                </div>

                <div className="p-6 bg-amber-50/50 dark:bg-amber-500/5 rounded-3xl border border-amber-100/50 dark:border-amber-500/10 flex gap-4 items-start">
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                    <Shield size={16} />
                  </div>
                  <div className="space-y-1 text-xs text-amber-900/70 dark:text-amber-400/70 font-serif leading-relaxed">
                    <p className="font-bold text-amber-900 dark:text-amber-400">Seguridad Prioritaria</p>
                    <p>Esta llave se usará preferencialmente sobre la llave global configurada en el sistema.</p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl ${
                    isSaved 
                    ? 'bg-green-500 text-white shadow-green-500/20' 
                    : 'bg-gray-900 text-white hover:bg-black dark:bg-amber-500 dark:text-black shadow-gray-900/10 dark:shadow-amber-500/10'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check size={18} />
                      <span>¡Guardado Correctamente!</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Guardar Configuración</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
