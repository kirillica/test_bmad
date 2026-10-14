import { DropZone } from '../components/DropZone';
import { WarningBanner } from '../components/WarningBanner';
import { messageForIssue, ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

export function UploadScreen() {
  const { state, loadFile } = useWorkbookStore();
  const isLoading = state.status === 'loading';
  const hasErrors = state.errorIssues.length > 0;
  const hasWarnings = !hasErrors && state.validation?.status === 'warnings';

  return (
    <section className="upload-screen" aria-busy={isLoading}>
      <h1 className="screen-title">{ru.screenTitle}</h1>

      <DropZone disabled={isLoading} onFile={loadFile} />

      {isLoading ? (
        <p className="status-line" role="status">
          {state.pendingFileName ? ru.readingFile(state.pendingFileName) : ru.reading}
        </p>
      ) : null}

      {hasErrors ? (
        <div className="error-banner" role="alert">
          <p className="error-title">{ru.errorTitle}</p>
          <ul>
            {state.errorIssues.map((issue) => (
              <li key={`${issue.code}-${issue.column ?? ''}`}>{messageForIssue(issue)}</li>
            ))}
          </ul>
          <p className="error-hint">{ru.fixAndRetry}</p>
        </div>
      ) : null}

      {hasWarnings && state.validation ? <WarningBanner issues={state.validation.issues} /> : null}

      {state.workbook ? (
        <div className="result-card">
          <p className="result-title">{ru.ready}</p>
          <p className="result-line">{ru.fileNameLine(state.workbook.fileName)}</p>
          <p className="result-line">{ru.sheetsCount(state.workbook.sheets.length)}</p>
        </div>
      ) : null}
    </section>
  );
}
