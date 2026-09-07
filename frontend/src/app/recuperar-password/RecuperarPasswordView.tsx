'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/site/AuthShell';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import { EYEBROW, INPUT, INVERT_BUTTON } from '@/lib/design';

type Step = 'email' | 'code' | 'reset' | 'done';

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 24,
  margin: '0 0 10px',
  textAlign: 'center',
};

const SUBTITLE: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--muted)',
  textAlign: 'center',
  margin: '0 0 28px',
};

export function RecuperarPasswordView() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent<HTMLFormElement>, payload: Record<string, string>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const response = await apiSend<{ next: Step }>('/api/auth/recover', 'POST', { step, ...payload });
      setStep(response.next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos continuar.';
      setError(message);
      toast.error('No pudimos continuar', message);
    } finally {
      setSending(false);
    }
  }

  const errorLine = error ? (
    <div role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
      {error}
    </div>
  ) : null;
  const buttonStyle = { ...INVERT_BUTTON, opacity: sending ? 0.6 : 1 };

  return (
    <AuthShell>
      {step === 'email' && (
        <div>
          <h1 style={TITLE}>Recuperar contraseña</h1>
          <p style={SUBTITLE}>Ingresá tu email y te enviamos un enlace para restablecerla.</p>
          <form
            onSubmit={(event) => submit(event, { email })}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={INPUT}
            />
            {errorLine}
            <button type="submit" disabled={sending} style={buttonStyle}>
              Enviar enlace
            </button>
          </form>
        </div>
      )}

      {step === 'code' && (
        <div>
          <h1 style={TITLE}>Revisá tu email</h1>
          <p style={SUBTITLE}>Te enviamos un código de 6 dígitos.</p>
          <form
            onSubmit={(event) => submit(event, { code })}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <input
              required
              inputMode="numeric"
              placeholder="Código de verificación"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              style={{ ...INPUT, textAlign: 'center', letterSpacing: '0.3em' }}
            />
            {errorLine}
            <button type="submit" disabled={sending} style={buttonStyle}>
              Verificar código
            </button>
          </form>
        </div>
      )}

      {step === 'reset' && (
        <div>
          <h1 style={TITLE}>Nueva contraseña</h1>
          <p style={SUBTITLE}>Elegí una nueva contraseña para tu cuenta.</p>
          <form
            onSubmit={(event) => submit(event, { password, confirm })}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <input
              required
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={INPUT}
            />
            <input
              required
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              style={INPUT}
            />
            {errorLine}
            <button type="submit" disabled={sending} style={buttonStyle}>
              Guardar contraseña
            </button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...EYEBROW, marginBottom: 16 }}>Listo</div>
          <h1 style={{ ...TITLE, margin: '0 0 20px' }}>Tu contraseña fue actualizada.</h1>
          <Link
            href="/login"
            style={{
              background: 'var(--invert-bg)',
              color: 'var(--invert-ink)',
              padding: '14px 28px',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Ir a Ingresar
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
