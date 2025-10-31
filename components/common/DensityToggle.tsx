import React from 'react';
import classNames from 'classnames';
import { useSettings, DensityMode } from '../../context/SettingsContext';

const OPTIONS: { value: DensityMode; label: string }[] = [
  { value: 'compact', label: 'Compacta' },
  { value: 'default', label: 'Padrão' },
  { value: 'spacious', label: 'Ampla' },
];

const DensityToggle: React.FC = () => {
  const { density, setDensity } = useSettings();

  return (
    <div className="toggle-group" role="group" aria-label="Ajustar densidade da interface">
      {OPTIONS.map(option => {
        const isActive = density === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={classNames('toggle-option', { 'toggle-option--active': isActive })}
            onClick={() => setDensity(option.value)}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default DensityToggle;
