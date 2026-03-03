
import React from 'react';
import type { ClassData } from '../types';
import Button from './common/Button';

interface ClassSelectorProps {
  classes: ClassData[];
  selectedClassId: string | null;
  onSelectClass: (id: string) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ classes, selectedClassId, onSelectClass }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {classes.map((cls) => (
        <Button
          key={cls.id}
          onClick={() => onSelectClass(cls.id)}
          variant={selectedClassId === cls.id ? 'primary' : 'secondary'}
        >
          {cls.name}
        </Button>
      ))}
    </div>
  );
};

export default ClassSelector;
