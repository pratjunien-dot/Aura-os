import { motion, AnimatePresence } from 'framer-motion';
import { Glass } from './Glass';
import { X } from 'lucide-react';
import { drawerVariants } from '@/lib/motion';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title: string;
  children: React.ReactNode;
}

export const Drawer = ({ isOpen, onClose, side = 'left', title, children }: DrawerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <Glass
            level="l4"
            as="div"
            className={`fixed top-0 bottom-0 w-80 z-50 rounded-none border-y-0 ${side === 'left' ? 'left-0 border-l-0 border-r' : 'right-0 border-r-0 border-l'} border-theme-primary/30 flex flex-col`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { x: side === 'left' ? '-100%' : '100%', opacity: 0 },
              visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
              exit: { x: side === 'left' ? '-100%' : '100%', opacity: 0, transition: { duration: 0.2 } }
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-theme-primary/20">
              <h2 className="font-mono text-lg text-theme-primary-light uppercase tracking-widest">{title}</h2>
              <button onClick={onClose} className="text-theme-primary hover:text-theme-primary-light transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </Glass>
        </>
      )}
    </AnimatePresence>
  );
};
