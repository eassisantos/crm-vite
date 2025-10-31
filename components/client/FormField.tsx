
import React from 'react';
import { Sparkles } from 'lucide-react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  isAiFilled?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, isAiFilled, children, className = '' }) => {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        <div className="flex items-center">
          <span>{label}</span>
          {isAiFilled && (
            <Sparkles size={14} className="ml-1.5 text-sky-500" title="Preenchido pela IA" />
          )}
        </div>
      </label>
      {children}
    </div>
  );
};

export default FormField;
