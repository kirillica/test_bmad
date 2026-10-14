import { DropZone } from '../components/DropZone';
import { ErrorBanner } from '../components/ErrorBanner';
import { ru } from '../i18n/ru';
import { useWorkbookStore } from '../store/context';

export function UploadScreen() {
  const { state, loadFile } = useWorkbookStore();
  const isLoading = state.status === 'loading';

  return (
    <section className="upload-screen" aria-busy={isLoading}>
      <h1 className="screen-title">{ru.screenTitle}</h1>

      <DropZone disabled={isLoading} onFile={loadFile} />

      {isLoading ? (
        <p className="status-line" role="status">
          {state.pendingFileName ? ru.readingFile(state.pendingFileName) : ru.reading}
        </p>
      ) : null}

      <ErrorBanner issues={state.errorIssues} />
    </section>
  );
}
