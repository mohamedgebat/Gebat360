import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Layers } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Rechercher ou sélectionner...',
  label,
  required = false,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fermeture automatique lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus automatique sur le champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Option actuellement sélectionnée
  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  // Filtrage des options selon le terme de recherche
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      o.value.toLowerCase().includes(term) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-slate-700 dark:text-slate-200 font-extrabold text-xs mb-1.5 flex items-center justify-between">
          <span>{label} {required && <span className="text-rose-500">*</span>}</span>
          {options.length > 0 && (
            <span className="text-[10px] text-slate-400 font-mono font-normal">
              ({options.length} éléments)
            </span>
          )}
        </label>
      )}
        {/* BOUTON DECLENCHEUR DU SELECT */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between text-left shadow-xs ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
            : 'border-slate-300 hover:border-slate-400 bg-white text-slate-900'
        } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`}
      >
        <div className="truncate pr-2 font-mono flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <>
              <span className="font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] shrink-0">
                {selectedOption.badge || selectedOption.value}
              </span>
              <span className="truncate text-slate-800 font-semibold font-sans">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 font-sans font-semibold truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-1 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* POPOVER / LISTE DÉROULANTE AVEC BARRE DE RECHERCHE RAPIDE ALIGNÉE AU CONTENEUR */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden w-full max-w-full animate-in fade-in slide-in-from-top-2 duration-150">
          {/* BARRE DE RECHERCHE EN TÊTE */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Saisissez un N° Prix, Code WBS ou Désignation..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* LISTE DES OPTIONS FILTRÉES */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full p-2.5 text-left rounded-xl flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-extrabold'
                        : 'hover:bg-slate-50 text-slate-800 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-2 min-w-0 flex-1">
                      <span className={`font-mono text-[11px] font-black px-2 py-0.5 rounded border shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {opt.badge || opt.value}
                      </span>
                      <div className="truncate min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} className="text-blue-600 shrink-0 font-bold ml-1" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs font-semibold">
                Aucun résultat pour "{searchTerm}"
              </div>
            )}
          </div>

          {/* PIED DE PAGE AVEC COMPTEUR */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>{filteredOptions.length} sur {options.length} éléments</span>
            {searchTerm && <span>Filtre actif</span>}
          </div>
        </div>
      )}
    </div>
  );
};
