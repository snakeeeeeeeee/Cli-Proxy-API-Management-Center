import { Fragment } from 'react';
import { Button } from '@/components/ui/Button';
import { IconX } from '@/components/ui/icons';
import type { ModelEntry } from './poolInputTransforms';
import type { HeaderEntry } from '@/utils/headers';

interface HeaderInputListProps {
  entries: HeaderEntry[];
  onChange: (entries: HeaderEntry[]) => void;
  addLabel: string;
  disabled?: boolean;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  removeButtonTitle?: string;
  removeButtonAriaLabel?: string;
}

interface ModelInputListProps {
  entries: ModelEntry[];
  onChange: (entries: ModelEntry[]) => void;
  addLabel?: string;
  disabled?: boolean;
  namePlaceholder?: string;
  aliasPlaceholder?: string;
  className?: string;
  rowClassName?: string;
  inputClassName?: string;
  removeButtonClassName?: string;
  removeButtonTitle?: string;
  removeButtonAriaLabel?: string;
}

export function HeaderInputList({
  entries,
  onChange,
  addLabel,
  disabled = false,
  keyPlaceholder = 'X-Custom-Header',
  valuePlaceholder = 'value',
  removeButtonTitle = 'Remove',
  removeButtonAriaLabel = 'Remove',
}: HeaderInputListProps) {
  const currentEntries = entries.length ? entries : [{ key: '', value: '' }];
  const updateEntry = (index: number, field: 'key' | 'value', value: string) => {
    onChange(
      currentEntries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };
  const removeEntry = (index: number) => {
    const next = currentEntries.filter((_, entryIndex) => entryIndex !== index);
    onChange(next.length ? next : [{ key: '', value: '' }]);
  };

  return (
    <div className="header-input-list">
      {currentEntries.map((entry, index) => (
        <Fragment key={index}>
          <div className="header-input-row">
            <input
              className="input"
              placeholder={keyPlaceholder}
              value={entry.key}
              onChange={(event) => updateEntry(index, 'key', event.target.value)}
              disabled={disabled}
            />
            <span className="header-separator">:</span>
            <input
              className="input"
              placeholder={valuePlaceholder}
              value={entry.value}
              onChange={(event) => updateEntry(index, 'value', event.target.value)}
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEntry(index)}
              disabled={disabled || currentEntries.length <= 1}
              title={removeButtonTitle}
              aria-label={removeButtonAriaLabel}
            >
              <IconX size={14} />
            </Button>
          </div>
        </Fragment>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange([...currentEntries, { key: '', value: '' }])}
        disabled={disabled}
        className="align-start"
      >
        {addLabel}
      </Button>
    </div>
  );
}

export function ModelInputList({
  entries,
  onChange,
  addLabel,
  disabled = false,
  namePlaceholder = 'model-name',
  aliasPlaceholder = 'alias (optional)',
  className = '',
  rowClassName = '',
  inputClassName = '',
  removeButtonClassName = '',
  removeButtonTitle = 'Remove',
  removeButtonAriaLabel = 'Remove',
}: ModelInputListProps) {
  const currentEntries = entries.length ? entries : [{ name: '', alias: '' }];
  const updateEntry = (index: number, field: 'name' | 'alias', value: string) => {
    onChange(
      currentEntries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };
  const removeEntry = (index: number) => {
    const next = currentEntries.filter((_, entryIndex) => entryIndex !== index);
    onChange(next.length ? next : [{ name: '', alias: '' }]);
  };

  return (
    <div className={['header-input-list', className].filter(Boolean).join(' ')}>
      {currentEntries.map((entry, index) => (
        <Fragment key={index}>
          <div className={['header-input-row', rowClassName].filter(Boolean).join(' ')}>
            <input
              className={['input', inputClassName].filter(Boolean).join(' ')}
              placeholder={namePlaceholder}
              value={entry.name}
              onChange={(event) => updateEntry(index, 'name', event.target.value)}
              disabled={disabled}
            />
            <span className="header-separator">→</span>
            <input
              className={['input', inputClassName].filter(Boolean).join(' ')}
              placeholder={aliasPlaceholder}
              value={entry.alias}
              onChange={(event) => updateEntry(index, 'alias', event.target.value)}
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEntry(index)}
              disabled={disabled || currentEntries.length <= 1}
              className={removeButtonClassName}
              title={removeButtonTitle}
              aria-label={removeButtonAriaLabel}
            >
              <IconX size={14} />
            </Button>
          </div>
        </Fragment>
      ))}
      {addLabel ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...currentEntries, { name: '', alias: '' }])}
          disabled={disabled}
          className="align-start"
        >
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
