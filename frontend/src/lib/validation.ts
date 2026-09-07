export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  number: boolean;
}

/** Requisitos de contraseña que la UI muestra en vivo y la API revalida. */
export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function passwordIsValid(password: string): boolean {
  const checks = passwordChecks(password);
  return checks.length && checks.upper && checks.number;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
