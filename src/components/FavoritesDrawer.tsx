import { Drawer } from '@/ui/Drawer';
import { useUIStore } from '@/stores/uiStore';
import { Glass } from '@/ui/Glass';
import { Star, Trash2, Play, Bot } from 'lucide-react';
import { DynamicIcon } from './DynamicIcon';
import { Persona } from '@/types';

interface FavoritesDrawerProps {
  favorites: Record<string, Persona>;
  onSelect: (persona: Persona) => void;
  onRemove: (personaName: string) => void;
}

export const FavoritesDrawer = ({ favorites, onSelect, onRemove }: FavoritesDrawerProps) => {
  const { drawers, closeDrawer } = useUIStore();

  return (
    <Drawer
      isOpen={drawers.favorites}
      onClose={() => closeDrawer('favorites')}
      side="left"
      title="Favoris"
    >
      <div className="space-y-4">
        {Object.keys(favorites).length === 0 ? (
          <p className="font-mono text-sm text-theme-primary/50 text-center mt-8">Aucun persona favori.</p>
        ) : (
          Object.values(favorites).map((persona) => (
            <Glass key={persona.name} level="l2" className="p-3 flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                  <DynamicIcon 
                    name={persona.icon || "Bot"} 
                    size={16} 
                    className="text-theme-primary" 
                  />
                </div>
                <span className="font-mono text-sm text-theme-primary-light uppercase">{persona.name}</span>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    onSelect(persona);
                    closeDrawer('favorites');
                  }}
                  className="text-theme-primary hover:text-theme-primary-light p-1"
                  title="Lancer"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onRemove(persona.name)}
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
