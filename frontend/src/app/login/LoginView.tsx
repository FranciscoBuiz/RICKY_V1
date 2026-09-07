'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/site/AuthShell';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import { INPUT } from '@/lib/design';
import { isEmail } from '@/lib/validation';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const toast = useToast();

  // El botón queda gris hasta que el email tiene forma y hay contraseña.
  const complete = isEmail(email) && password.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) return;

    setLoading(true);
    setErrorMsg('');

    try {
      await apiSend('/api/auth/login', 'POST', { email, password, remember });
      setSignedIn(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos ingresar.';
      setErrorMsg(message);
      toast.error('No pudimos ingresar', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          margin: '0 0 8px',
          textAlign: 'center',
        }}
      >
        Ingresar
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', margin: '0 0 32px' }}>
        Accedé a tu cuenta de 5848 Motors.
      </p>

      {errorMsg && (
        <div
          style={{
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: 13,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}

      {signedIn && (
        <div
          style={{
            background: '#EFF6F0',
            border: '1px solid #CFE6D3',
            color: '#2F7A4D',
            fontSize: 13,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          Sesión iniciada. Te llevamos al panel cuando esté conectado el backend de auth.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label
            htmlFor="login-email"
            style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}
          >
            Email
          </label>
          <input
            id="login-email"
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.replace(/\s/g, ''))}
            aria-invalid={email.length > 0 && !isEmail(email) ? true : undefined}
            style={INPUT}
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}
          >
            Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{ ...INPUT, paddingRight: 78 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}
        >
          <label
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-strong)' }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember((value) => !value)}
            />
            Recordarme
          </label>
          <Link
            href="/recuperar-password"
            className="ui-link"
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
          >
            Olvidé mi contraseña
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || !complete}
          aria-disabled={!complete}
          style={{
            background: loading || !complete ? 'var(--border)' : 'var(--invert-bg)',
            color: loading || !complete ? 'var(--muted)' : 'var(--invert-ink)',
            border: 'none',
            padding: 14,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || !complete ? 'not-allowed' : 'pointer',
            marginTop: 6,
          }}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '24px 0 0' }}>
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="ui-link" style={{ fontWeight: 600, color: 'var(--ink)' }}>
          Registrate
        </Link>
      </p>
    </AuthShell>
  );
}
