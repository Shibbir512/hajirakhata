
import React from 'react';
import type { ClassData } from '../types';

interface ClassSelectorProps {
  classes: ClassData[];
  selectedClassId: string | null;
  onSelectClass: (id: string) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ classes, selectedClassId, onSelectClass }) => {
  return (
    <div className="border-b border-slate-200 px-2 sm:px-4 py-2 flex overflow-x-auto gap-2 bg-slate-50 rounded-t-xl no-scrollbar">
        {classes.map((cls) => (
            <button
                key={cls.id}
                onClick={() => onSelectClass(cls.id)}
                className={`px-5 py-2 text-sm font-bold rounded-lg shadow-sm transition whitespace-nowrap flex-shrink-0 ${
                    selectedClassId === cls.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 font-medium'
                }`}
            >
                <i className="fa-solid fa-layer-group mr-1.5"></i> {cls.name}
            </button>
        ))}
    </div>
  );
};

export default ClassSelector;
