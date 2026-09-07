import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Zap, 
  Sliders, 
  GitFork, 
  Maximize2, 
  Layers, 
  Database, 
  PlusCircle, 
  ToggleRight, 
  Cpu, 
  Activity, 
  Clock, 
  CircleDot, 
  Sun, 
  Grid, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Tag, 
  Minimize2, 
  TrendingUp, 
  FastForward, 
  Scale, 
  ToggleLeft, 
  FileText, 
  Volume2, 
  X,
  Plus
} from 'lucide-react';
import { 
  COMPONENT_REGISTRY, 
  CATEGORY_METADATA, 
  type ComponentCategory, 
  type ComponentDefinition 
} from '../../utils/components/componentRegistry';

interface MacroLibraryProps {
  isOpen: boolean;
  onAddComponent?: (componentId: string) => void;
}

// Icon mapping helper
const renderIcon = (iconName: string, size = 16) => {
  switch (iconName) {
    case 'Zap': return <Zap size={size} />;
    case 'Sliders': return <Sliders size={size} />;
    case 'GitFork': return <GitFork size={size} />;
    case 'Maximize2': return <Maximize2 size={size} />;
    case 'Layers': return <Layers size={size} />;
    case 'Database': return <Database size={size} />;
    case 'PlusCircle': return <PlusCircle size={size} />;
    case 'ToggleRight': return <ToggleRight size={size} />;
    case 'Cpu': return <Cpu size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'Clock': return <Clock size={size} />;
    case 'CircleDot': return <CircleDot size={size} />;
    case 'Sun': return <Sun size={size} />;
    case 'Grid': return <Grid size={size} />;
    case 'ArrowUpCircle': return <ArrowUpCircle size={size} />;
    case 'ArrowDownCircle': return <ArrowDownCircle size={size} />;
    case 'Tag': return <Tag size={size} />;
    case 'Minimize2': return <Minimize2 size={size} />;
    case 'TrendingUp': return <TrendingUp size={size} />;
    case 'FastForward': return <FastForward size={size} />;
    case 'Scale': return <Scale size={size} />;
    case 'ToggleLeft': return <ToggleLeft size={size} />;
    case 'FileText': return <FileText size={size} />;
    case 'Volume2': return <Volume2 size={size} />;
    default: return <Cpu size={size} />;
  }
};

export const MacroLibrary: React.FC<MacroLibraryProps> = ({ isOpen, onAddComponent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    logic: true,
    io: true,
    wires: true,
    plexers: false,
    flipflops: false,
    memory: false,
    arithmetic: false,
    switches: false,
    misc: false,
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const componentsByCategory = useMemo(() => {
    const list = Object.values(COMPONENT_REGISTRY);
    const filtered = searchQuery.trim() === ''
      ? list
      : list.filter(comp => 
          comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const grouped: Record<ComponentCategory, ComponentDefinition[]> = {
      logic: [],
      io: [],
      wires: [],
      plexers: [],
      flipflops: [],
      memory: [],
      arithmetic: [],
      switches: [],
      misc: [],
    };

    filtered.forEach(comp => {
      if (grouped[comp.category]) {
        grouped[comp.category].push(comp);
      }
    });

    return grouped;
  }, [searchQuery]);

  const categoriesSorted = useMemo(() => {
    return (Object.keys(CATEGORY_METADATA) as ComponentCategory[]).sort(
      (a, b) => CATEGORY_METADATA[a].order - CATEGORY_METADATA[b].order
    );
  }, []);

  const totalFilteredCount = useMemo(() => {
    return Object.values(componentsByCategory).reduce((acc, items) => acc + items.length, 0);
  }, [componentsByCategory]);

  return (
    <div
      className={`sidebar-panel bg-[#0d1117] border-r border-gray-800 flex flex-col h-full select-none shrink-0 ${isOpen ? 'open' : 'closed'}`}
      style={{ width: isOpen ? 260 : 0, minWidth: isOpen ? 260 : 0 }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#161b22] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-500/20 text-blue-400">
            <Cpu size={15} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">Digital Library</h3>
            <span className="text-[10px] text-gray-400">HNeemann Components</span>
          </div>
        </div>
        <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full border border-gray-700 font-mono">
          {totalFilteredCount}
        </span>
      </div>

      {/* Search Bar */}
      <div className="p-2.5 border-b border-gray-800/80 bg-[#11161d] shrink-0">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Bileşen ara (AND, MUX, D-FF...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1c2128] border border-gray-700/70 rounded-md pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-gray-400 hover:text-white p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Accordion Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {categoriesSorted.map(catKey => {
          const catMeta = CATEGORY_METADATA[catKey];
          const items = componentsByCategory[catKey] || [];
          const isCategoryOpen = searchQuery ? items.length > 0 : !!openCategories[catKey];

          if (searchQuery && items.length === 0) return null;

          return (
            <div key={catKey} className="rounded-md border border-gray-800/60 bg-[#131820] overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full px-2.5 py-2 flex items-center justify-between text-left hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-gray-400">
                    {isCategoryOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                  <span className="text-xs font-semibold text-gray-300 truncate">
                    {catMeta.label}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono px-1 bg-gray-800/50 rounded shrink-0">
                  {items.length}
                </span>
              </button>

              {/* Items List */}
              {isCategoryOpen && (
                <div className="p-1.5 pt-0 space-y-1 border-t border-gray-800/30">
                  {items.map(comp => (
                    <div
                      key={comp.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', comp.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="group flex items-center justify-between p-1.5 rounded bg-[#1c2128]/80 hover:bg-[#252d38] border border-gray-700/40 hover:border-blue-500/60 cursor-grab active:cursor-grabbing transition-all shadow-xs"
                      title={comp.description}
                    >
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <div className="p-1 rounded bg-gray-800 text-blue-400 group-hover:text-blue-300 shrink-0">
                          {renderIcon(comp.iconName, 13)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-gray-200 group-hover:text-white truncate">
                            {comp.name}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate leading-tight">
                            {comp.description}
                          </div>
                        </div>
                      </div>

                      {/* Click to add button */}
                      {onAddComponent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddComponent(comp.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-600 text-gray-400 hover:text-white transition-opacity shrink-0 ml-1"
                          title="Tuvale Ekle"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {totalFilteredCount === 0 && (
          <div className="p-6 text-center text-gray-500 text-xs">
            Eşleşen bileşen bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
};
