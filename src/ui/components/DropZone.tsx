import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { isSupportedFileName } from '../../adapters/file-source';
import { ru } from '../i18n/ru';

interface DropZoneProps {
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function DropZone({ disabled = false, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedFileName(file.name)) {
      setRejected(file.name);
      return;
    }
    setRejected(null);
    onFile(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files[0]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <p className="dropzone-title">{ru.dropTitle}</p>
        <p className="dropzone-hint">{ru.dropHint}</p>
        <p className="dropzone-meta">{ru.formatsHint}</p>
        <span className="btn btn-primary">{ru.chooseFile}</span>
      </div>

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".xls,.xlsx"
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {rejected ? (
        <p className="dropzone-reject" role="alert">
          {`${ru.rejectedFile(rejected)} ${ru.formatsHint}`}
        </p>
      ) : null}

      <p className="privacy">{ru.privacy}</p>
    </div>
  );
}
