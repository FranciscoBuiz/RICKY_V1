'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FieldLabel, FieldMessage } from '@/components/ui/TextField';
import { FIELD, INPUT } from '@/lib/design';
import { fieldError, fieldRules, rankSuggestions, type FieldKind } from '@/lib/fields';
import { normalizeText } from '@/lib/format';

interface AutocompleteFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Opciones a sugerir. Vacío = el campo se comporta como un input común. */
  suggestions: string[];
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
  showError?: boolean;
  variant?: 'site' | 'panel';
  /** Máximo de sugerencias visibles. */
  limit?: number;
  style?: CSSProperties;
}

/** Parte la opción en tres para poder resaltar el tramo que coincide. */
function highlight(option: string, query: string) {
  const term = normalizeText(query);
  if (!term) return <>{option}</>;

  const index = normalizeText(option).indexOf(term);
  if (index === -1) return <>{option}</>;

  return (
    <>
      {option.slice(0, index)}
      <strong style={{ color: 'var(--accent)' }}>{option.slice(index, index + term.length)}</strong>
      {option.slice(index + term.length)}
    </>
  );
}

/**
 * Input de texto libre con sugerencias. Sigue el patrón ARIA de combobox: se
 * navega con las flechas, se acepta con Enter y se cierra con Escape, pero el
 * visitante siempre puede escribir algo que no esté en la lista.
 */
export function AutocompleteField({
  label,
  value,
  onChange,
  suggestions,
  kind = 'text',
  required = false,
  placeholder,
  showError = false,
  variant = 'site',
  limit = 7,
  style,
}: AutocompleteFieldProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const hintId = `${inputId}-hint`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rule = fieldRules[kind];
  const error = fieldError(kind, value, required);
  const visible = error && (touched || showError) ? error : null;

  const matches = useMemo(() => rankSuggestions(suggestions, value, limit), [suggestions, value, limit]);

  // Si lo tipeado ya es exactamente una opción, no hay nada que sugerir.
  const exact = matches.length === 1 && normalizeText(matches[0]) === normalizeText(value);
  const listOpen = open && matches.length > 0 && !exact;

  useEffect(() => {
    if (!listOpen) setActiveIndex(-1);
  }, [listOpen]);

  // Un clic fuera cierra la lista; el blur solo no alcanza porque elegir una
  // opción con el mouse también dispara blur.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function accept(option: string) {
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  /** Mueve el resaltado dando la vuelta al llegar a los extremos. */
  function move(step: number) {
    setActiveIndex((current) => {
      const next = current + step;
      if (next < 0) return matches.length - 1;
      if (next >= matches.length) return 0;
      return next;
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!listOpen) {
        setOpen(true);
        return;
      }
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    // Con la lista abierta, Tab recorre las opciones en vez de saltar al campo
    // siguiente. La salida es Escape (o elegir una opción), que cierra la lista
    // y devuelve a Tab su comportamiento normal — por eso el pie de la lista lo
    // dice: si no, sería una trampa de teclado.
    if (event.key === 'Tab' && listOpen) {
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'Enter' && listOpen && activeIndex >= 0) {
      // Sólo interceptamos el Enter cuando hay una opción resaltada; si no, el
      // formulario se envía como siempre.
      event.preventDefault();
      accept(matches[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}

      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          value={value}
          required={required}
          placeholder={placeholder}
          maxLength={rule.maxLength}
          autoComplete="off"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-label={label ? undefined : placeholder}
          aria-invalid={visible ? true : undefined}
          aria-describedby={visible ? hintId : undefined}
          onChange={(event) => {
            onChange(rule.sanitize(event.target.value));
            setOpen(true);
          }}
          // Con el campo vacío la lista queda cerrada: así, tabular por un
          // formulario en blanco sigue saltando de campo en campo. Se abre al
          // tipear, o con la flecha abajo si se la quiere ver entera.
          onFocus={() => value.trim() !== '' && setOpen(true)}
          onBlur={() => setTouched(true)}
          onKeyDown={onKeyDown}
          style={variant === 'site' ? INPUT : FIELD}
        />

        {listOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label ? `Sugerencias de ${label.toLowerCase()}` : 'Sugerencias'}
            className="fadein"
            style={{
              position: 'absolute',
              top: 'calc(100% + 2px)',
              left: 0,
              right: 0,
              zIndex: 30,
              margin: 0,
              padding: 0,
              listStyle: 'none',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 14px 30px rgba(23,21,18,0.16)',
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {matches.map((option, index) => (
              <li key={option}>
                <button
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  // `preventDefault` en mousedown evita que el input pierda el
                  // foco antes de que el clic llegue a registrarse.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => accept(option)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: index === activeIndex ? 'var(--bg)' : 'transparent',
                    color: 'var(--ink)',
                    padding: '10px 12px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {highlight(option, value)}
                </button>
              </li>
            ))}
            <li
              aria-hidden
              style={{
                borderTop: '1px solid var(--border2)',
                padding: '7px 12px',
                fontSize: 11,
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
                position: 'sticky',
                bottom: 0,
                background: 'var(--card)',
              }}
            >
              Tab recorre · Enter elige · Esc sale
            </li>
          </ul>
        )}
      </div>

      {visible && <FieldMessage id={hintId} text={visible} tone="error" />}
    </div>
  );
}
