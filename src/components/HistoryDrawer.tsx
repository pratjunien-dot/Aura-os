import { Drawer } from '@/ui/Drawer';
import { useUIStore } from '@/stores/uiStore';
import { Glass } from '@/ui/Glass';
import { Clock, Trash2, Play } from 'lucide-react';

interface HistoryDrawerProps {
  sessions: any[];
  onSelect: (sessionId: string) => void;
  onRemove: (sessionId: string) => void;
}

export const HistoryDrawer = ({ sessions, onSelect, onRemove }: HistoryDrawerProps) => {
  const { drawers, closeDrawer } = useUIStore();

  return (
    <Drawer
      isOpen={drawers.history}
      onClose={() => closeDrawer('history')}
      side="right"
      title="Historique"
    >
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <p className="font-mono text-sm text-theme-primary/50 text-center mt-8">Aucune session.</p>
        ) : (
          sessions.map((session) => (
            <Glass key={session.id} level="l2" className="p-3 flex items-center justify-between group">
              <div className="flex flex-col">
                <span className="font-mono text-sm text-theme-primary-light uppercase truncate w-40">{session.title}</span>
                <span className="font-mono text-[10px] text-theme-primary/50 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {session.updatedAt?.toDate().toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    onSelect(session.id);
                    closeDrawer('history');
                  }}
                  className="text-theme-primary hover:text-theme-primary-light p-1"
                  title="Reprendre"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onRemove(session.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Glass>
          ))
        )}
      </div>
    </Drawer>
  );
};
