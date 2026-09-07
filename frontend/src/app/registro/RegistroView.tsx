'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/site/AuthShell';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { apiSend } from '@/lib/api';
import { EYEBROW, INPUT } from '@/lib/design';
import { displayPhone, fieldsValid } from '@/lib/fields';
import { passwordChecks } from '@/lib/validation';

const requirementStyle = (ok: boolean): React.CSSProperties => ({
  fontSize: 12,
  color: ok ? '#2F7A4D' : 'var(--muted)',
});

export function RegistroView() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const toast = useToast();

  const checks = passwordChecks(password);
  const mismatch = confirm.length > 0 && password !== confirm;

  // Además de la contraseña, los datos personales tienen que ser válidos.
  const identityValid = fieldsValid([
    { kind: 'name', value: firstName, required: true },
    { kind: 'name', value: lastName, required: true },
    { kind: 'email', value: email, required: true },
    { kind: 'phone', value: phone, required: true },
  ]);

  const disabled =
    !identityValid ||
    !checks.length ||
    !checks.upper ||
    !checks.number ||
    mismatch ||
    confirm.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      setShowErrors(true);
      toast.error('Faltan datos', 'Revisá los campos marcados antes de crear la cuenta.');
      return;
    }

    setSending(true);
    try {
      await apiSend('/api/auth/register', 'POST', {
        firstName,
        lastName,
        email,
        phone: displayPhone(phone),
        password,
        confirm,
      });
      setSuccess(true);
      toast.success('Cuenta creada', 'Ya podés ingresar con tu email.');
    } catch (err) {
      toast.error(
        'No pudimos crear la cuenta',
        err instanceof Error ? err.message : 'Probá de nuevo en unos minutos.',
      );
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <AuthShell maxWidth={420}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...EYEBROW, marginBottom: 16 }}>Cuenta creada</div>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, margin: '0 0 20px' }}
          >
            Bienvenido a 5848 Motors.
          </h1>
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
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidth={420}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          margin: '0 0 8px',
          textAlign: 'center',
        }}
      >
        Crear cuenta
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', margin: '0 0 28px' }}>
        Registrate para hacer seguimiento de tus consultas.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: 16,
          }}
        >
          <TextField
            label="Nombre"
            kind="name"
            required
            value={firstName}
            onChange={setFirstName}
            showError={showErrors}
          />
          <TextField
            label="Apellido"
            kind="name"
            required
            value={lastName}
            onChange={setLastName}
            showError={showErrors}
          />
        </div>
        <TextField
          label="Email"
          kind="email"
          required
          value={email}
          onChange={setEmail}
          showError={showErrors}
        />
        <TextField
          label="Teléfono"
          kind="phone"
          required
          value={phone}
          onChange={setPhone}
          showError={showErrors}
        />
        <input
          required
          type="password"
          placeholder="Contraseña"
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: -4 }}>
          <div style={requirementStyle(checks.length)}>✓ Al menos 8 caracteres</div>
          <div style={requirementStyle(checks.upper)}>✓ Una letra mayúscula</div>
          <div style={requirementStyle(checks.number)}>✓ Un número</div>
          {mismatch && (
            <div style={{ fontSize: 12, color: 'var(--danger)' }}>Las contraseñas no coinciden.</div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || sending}
          style={{
            background: disabled ? 'var(--border)' : 'var(--invert-bg)',
            color: disabled ? 'var(--muted)' : 'var(--invert-ink)',
            border: 'none',
            padding: 14,
            fontSize: 14,
            fontWeight: 600,
            cursor: disabled || sending ? 'not-allowed' : 'pointer',
            marginTop: 6,
          }}
        >
          {sending ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '24px 0 0' }}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="ui-link" style={{ fontWeight: 600, color: 'var(--ink)' }}>
          Ingresá
        </Link>
      </p>
    </AuthShell>
  );
}
