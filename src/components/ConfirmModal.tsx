import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Eliminar' }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 border border-transparent dark:border-white/5"
          >
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold dark:text-red-500">{title}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2 px-4 bg-red-600 dark:bg-red-500 text-white dark:text-black rounded-xl font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
