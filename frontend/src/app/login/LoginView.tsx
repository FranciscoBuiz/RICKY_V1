'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/site/AuthShell';

/** Los codigos los produce el callback del backend. */
const MENSAJES: Record<string, string> = {
  no_invitado: 'Esa cuenta no tiene acceso al panel. Pedile una invitacion a un administrador.',
  email_sin_verificar: 'Tu cuenta de Google no tiene el email verificado.',
  cuenta_en_conflicto: 'Ese email ya esta asociado a otra cuenta de Google.',
  state_invalido: 'No pudimos validar el intento de ingreso. Proba de nuevo.',
  sesion_expirada: 'Tardaste demasiado y el intento vencio. Proba de nuevo.',
  google_rechazo: 'Cancelaste el ingreso con Google.',
  google_fallo: 'No pudimos verificar tu cuenta con Google. Proba de nuevo.',
};

function LoginContent() {
  const params = useSearchParams();
  const [remember, setRemember] = useState(true);

  const codigo = params.get('error');
  const errorMsg = codigo ? (MENSAJES[codigo] ?? 'No pudimos iniciar tu sesion.') : '';

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
        El panel es solo para el equipo de 5848 Motors.
      </p>

      {errorMsg && (
        <div
          role="alert"
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

      {/*
        Un <a>, no un fetch: el flujo OAuth es una navegacion del navegador. Un
        fetch recibiria el 302 hacia Google y no llevaria a ningun lado.
      */}
      <a
        href={`/api/auth/google${remember ? '?remember=1' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'var(--invert-bg)',
          color: 'var(--invert-ink)',
          padding: 14,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Entrar con Google
      </a>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--ink-strong)',
          marginTop: 14,
        }}
      >
        <input type="checkbox" checked={remember} onChange={() => setRemember((v) => !v)} />
        Recordarme en este dispositivo
      </label>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '24px 0 0' }}>
        El acceso al panel es por invitacion. Si no podes entrar, pedile a un
        administrador que te sume desde Configuracion.
      </p>
    </AuthShell>
  );
}

/**
 * `useSearchParams` exige un Suspense por encima o `next build` falla al
 * prerenderizar la pagina. Va aca y no en `page.tsx` para que el archivo quede
 * autocontenido.
 */
export function LoginView() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
