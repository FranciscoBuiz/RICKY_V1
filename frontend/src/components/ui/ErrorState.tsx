interface ErrorStateProps {
  /** Qué no se pudo hacer, en criollo. */
  title?: string;
  /** Mensaje que devolvió la API, si lo hay. */
  detail?: string | null;
  onRetry?: () => void;
  /** `panel` usa la superficie del admin; `page` es el bloque centrado del sitio. */
  variant?: 'page' | 'panel';
}

/** Bloque de error con reintento. Lo comparten el sitio público y el panel. */
export function ErrorState({
  title = 'No pudimos cargar la información.',
  detail,
  onRetry,
  variant = 'panel',
}: ErrorStateProps) {
  const panel = variant === 'panel';

  return (
    <div
      role="alert"
      style={{
        textAlign: 'center',
        padding: panel ? '48px 24px' : '96px 24px',
        background: panel ? 'var(--card)' : 'transparent',
        border: panel ? '1px solid var(--border)' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.1em',
          color: 'var(--danger)',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        Error
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: panel ? 18 : 24,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {detail && <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'var(--invert-bg)',
            color: 'var(--invert-ink)',
            border: 'none',
            padding: '12px 26px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: detail ? 0 : 18,
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
