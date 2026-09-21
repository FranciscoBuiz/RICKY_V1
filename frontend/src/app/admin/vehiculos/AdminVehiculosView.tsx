'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { margenVisible, marginTone } from '@/app/admin/vehiculos/margen';
import { AdminShell } from '@/components/admin/AdminShell';
import { AutocompleteField } from '@/components/ui/AutocompleteField';
import { ErrorState } from '@/components/ui/ErrorState';
import { Photo } from '@/components/ui/Photo';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { apiSend, useResource } from '@/lib/api';
import { CAR_BRANDS, modelsFor, versionsFor } from '@/lib/brands';
import { FIELD, adminVehicleStatus, pillStyle } from '@/lib/design';
import { fieldsValid } from '@/lib/fields';
import { kilometersShort, money, toNumber } from '@/lib/format';
import { useIsNarrow } from '@/lib/hooks';
import { puede } from '@/lib/roles';
import { useTheme } from '@/lib/theme';
import type { PanelUser, PanelVehicle, StockSummary, Vehicle, VehicleStatus } from '@/types';

interface StockResponse {
  vehicles: PanelVehicle[];
  total: number;
  stock: StockSummary;
}

const TABLE_GRID = '56px 220px 64px 90px 130px 120px 130px 130px 100px 140px';
/* Sin costos ni acciones: las columnas no se vacian, desaparecen. Una celda
   con guion invita a preguntar que dato falta; aca no falta ninguno. */
const TABLE_GRID_LECTURA = '56px 220px 64px 90px 130px 100px';

const EXPENSE_LABELS = [
  'Transferencia',
  'Gestoría',
  'Mecánica',
  'Chapa',
  'Pintura',
  'Detailing',
  'Repuestos',
  'Neumáticos',
  'Publicidad',
  'Otros',
];

const EXPENSE_KEYS = [
  'transferencia',
  'gestoria',
  'mecanica',
  'chapa',
  'pintura',
  'detailing',
  'repuestos',
  'neumaticos',
  'publicidad',
  'otros',
] as const;

type ExpenseKey = (typeof EXPENSE_KEYS)[number];
type Expenses = Record<ExpenseKey, string>;

const EMPTY_EXPENSES = Object.fromEntries(EXPENSE_KEYS.map((key) => [key, ''])) as Expenses;

const FUEL_VALUES: Vehicle['fuel'][] = ['Nafta', 'Diesel'];
const TRANSMISSION_VALUES: Vehicle['transmission'][] = ['Manual', 'Automática'];
const BODY_VALUES: Vehicle['bodyType'][] = ['Sedán', 'SUV', 'Hatchback', 'Pick-up'];

interface VehicleForm {
  id: string | null;
  brand: string;
  model: string;
  version: string;
  year: string;
  engine: string;
  fuel: string;
  transmission: string;
  traction: string;
  bodyType: string;
  mileage: string;
  color: string;
  purchasePrice: string;
  listingPrice: string;
  status: VehicleStatus;
  description: string;
}

const EMPTY_FORM: VehicleForm = {
  id: null,
  brand: '',
  model: '',
  version: '',
  year: '',
  engine: '',
  fuel: '',
  transmission: '',
  traction: '',
  bodyType: '',
  mileage: '',
  color: '',
  purchasePrice: '',
  listingPrice: '',
  status: 'available',
  description: '',
};

const GROUP_LABEL: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 10,
};

const ACTION_BUTTON: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'none',
  color: 'var(--ink)',
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

export function AdminVehiculosView({ usuario }: { usuario: PanelUser }) {
  const escribe = puede(usuario.role, 'escribir');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'datos' | 'gastos'>('datos');
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [expenses, setExpenses] = useState<Expenses>(EMPTY_EXPENSES);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PanelVehicle | null>(null);

  const isMobile = useIsNarrow(900);
  const { dark } = useTheme();
  const toast = useToast();

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    return `/api/admin/vehicles?${params.toString()}`;
  }, [search, statusFilter]);

  const { data, status, error, reload } = useResource<StockResponse>(query);
  const vehicles = data?.vehicles ?? [];

  const totalExpenses = EXPENSE_KEYS.reduce((sum, key) => sum + toNumber(expenses[key]), 0);
  const purchase = toNumber(form.purchasePrice);
  const listing = toNumber(form.listingPrice);
  const totalInvestment = purchase + totalExpenses;
  const potentialMargin = listing - totalInvestment;

  const formValid =
    fieldsValid([
      { kind: 'name', value: form.brand, required: true },
      { kind: 'name', value: form.model, required: true },
      { kind: 'year', value: form.year, required: true },
    ]) && listing > 0;

  const setFormField =
    (key: keyof VehicleForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const setFormValue = (key: keyof VehicleForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Mismas sugerencias encadenadas que en "Vendé tu auto": la marca acota los
  // modelos y el modelo, las versiones. Siguen aceptando texto libre.
  const modelSuggestions = useMemo(() => modelsFor(form.brand), [form.brand]);
  const versionSuggestions = useMemo(
    () => versionsFor(form.brand, form.model),
    [form.brand, form.model],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setExpenses(EMPTY_EXPENSES);
    setDrawerTab('datos');
    setShowErrors(false);
    setDrawerOpen(true);
  }

  function openEdit(vehicle: PanelVehicle) {
    setForm({
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      year: String(vehicle.year),
      engine: vehicle.engine ?? '',
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      traction: vehicle.traction ?? '',
      bodyType: vehicle.bodyType,
      mileage: String(vehicle.mileage),
      color: vehicle.color,
      purchasePrice: vehicle.purchasePrice ? String(vehicle.purchasePrice) : '',
      listingPrice: String(vehicle.price),
      status: vehicle.status,
      description: vehicle.description ?? '',
    });
    setExpenses({ ...EMPTY_EXPENSES, otros: vehicle.expenses ? String(vehicle.expenses) : '' });
    setDrawerTab('datos');
    setShowErrors(false);
    setDrawerOpen(true);
  }

  async function saveVehicle() {
    if (!formValid) {
      setShowErrors(true);
      setDrawerTab('datos');
      toast.error('Faltan datos', 'Marca, modelo, año y precio de publicación son obligatorios.');
      return;
    }

    setSaving(true);
    // Los campos con dominio cerrado sólo viajan si el valor elegido es válido.
    const payload = {
      brand: form.brand,
      model: form.model,
      version: form.version,
      year: toNumber(form.year) || new Date().getFullYear(),
      engine: form.engine,
      traction: form.traction,
      ...(FUEL_VALUES.includes(form.fuel as Vehicle['fuel']) ? { fuel: form.fuel as Vehicle['fuel'] } : {}),
      ...(TRANSMISSION_VALUES.includes(form.transmission as Vehicle['transmission'])
        ? { transmission: form.transmission as Vehicle['transmission'] }
        : {}),
      ...(BODY_VALUES.includes(form.bodyType as Vehicle['bodyType'])
        ? { bodyType: form.bodyType as Vehicle['bodyType'] }
        : {}),
      mileage: toNumber(form.mileage),
      color: form.color,
      purchasePrice: purchase,
      expenses: totalExpenses,
      price: listing,
      status: form.status,
      description: form.description,
    };

    try {
      if (form.id) await apiSend(`/api/admin/vehicles/${form.id}`, 'PATCH', payload);
      else await apiSend('/api/admin/vehicles', 'POST', payload);
      setDrawerOpen(false);
      toast.success(form.id ? 'Vehículo actualizado' : 'Vehículo agregado');
      reload();
    } catch (err) {
      toast.error(
        'No pudimos guardar el vehículo',
        err instanceof Error ? err.message : 'Revisá los datos e intentá de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await apiSend(`/api/admin/vehicles/${target.id}`, 'DELETE');
      toast.success('Vehículo eliminado', `${target.brand} ${target.model}`);
      reload();
    } catch (err) {
      toast.error(
        'No pudimos eliminar el vehículo',
        err instanceof Error ? err.message : 'Intentá de nuevo.',
      );
    }
  }

  const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: 12,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    background: active ? 'var(--bg)' : 'var(--card)',
    color: active ? 'var(--ink)' : 'var(--muted)',
    cursor: 'pointer',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
  });

  const saveButton = (
    <button
      type="button"
      onClick={saveVehicle}
      disabled={saving}
      style={{
        background: saving ? 'var(--border)' : 'var(--invert-bg)',
        color: saving ? 'var(--muted)' : 'var(--invert-ink)',
        border: 'none',
        padding: 13,
        fontSize: 14,
        fontWeight: 600,
        cursor: saving ? 'not-allowed' : 'pointer',
      }}
    >
      {saving ? 'Guardando…' : 'Guardar vehículo'}
    </button>
  );

  return (
    <AdminShell
      usuario={usuario}
      active="Vehículos"
      title={!isMobile ? <div style={{ fontSize: 14, fontWeight: 600 }}>Vehículos</div> : null}
      actions={
        escribe ? (
          <button
            type="button"
            onClick={openCreate}
            style={{
              background: 'var(--invert-bg)',
              color: 'var(--invert-ink)',
              border: 'none',
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Agregar vehículo
          </button>
        ) : null
      }
    >
      <div style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 3vw, 24px) 64px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar por marca o modelo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar vehículos"
            style={{ ...FIELD, minWidth: 200, flex: 1, maxWidth: 320 }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | VehicleStatus)}
            style={{ ...FIELD, width: 'auto' }}
            aria-label="Estado"
          >
            <option value="all">Estado — Todos</option>
            <option value="available">Disponible</option>
            <option value="reserved">Reservado</option>
            <option value="sold">Vendido</option>
          </select>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {status === 'loading' ? 'Cargando…' : `${vehicles.length} vehículos`}
          </div>
        </div>

        {status === 'loading' && <SkeletonTable rows={6} />}

        {status === 'error' && (
          <ErrorState title="No pudimos cargar el stock." detail={error} onRetry={reload} />
        )}

        {status === 'ready' && vehicles.length === 0 && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin resultados</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Probá con otra búsqueda o cambiá el filtro de estado.
            </div>
          </div>
        )}

        {status === 'ready' && vehicles.length > 0 && !isMobile && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: escribe ? TABLE_GRID : TABLE_GRID_LECTURA,
                gap: 12,
                minWidth: escribe ? 1160 : 660,
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <div />
              <div>Vehículo</div>
              <div>Año</div>
              <div>Km</div>
              {escribe && (
                <>
                  <div>P. compra</div>
                  <div>Gastos</div>
                </>
              )}
              <div>P. público</div>
              {escribe && <div>Margen pot.</div>}
              <div>Estado</div>
              {escribe && <div>Acciones</div>}
            </div>

            {vehicles.map((vehicle) => {
              const margen = margenVisible(vehicle);
              return (
                <div
                  key={vehicle.id}
                  className="ui-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: escribe ? TABLE_GRID : TABLE_GRID_LECTURA,
                    gap: 12,
                    minWidth: escribe ? 1160 : 660,
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border2)',
                    alignItems: 'center',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Photo
                    src={vehicle.images[0]?.src}
                    alt=""
                    decorative
                    style={{ width: 56, height: 42, flexShrink: 0 }}
                    fallback={
                      <div style={{ position: 'absolute', inset: 0, background: 'var(--placeholder-a)' }} />
                    }
                  />
                  <div style={{ fontWeight: 600 }}>
                    {vehicle.brand} {vehicle.model}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{vehicle.year}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {kilometersShort(vehicle.mileage)}
                  </div>
                  {escribe && (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {vehicle.purchasePrice ? (
                          money(vehicle.purchasePrice)
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {vehicle.expenses ? (
                          money(vehicle.expenses)
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </div>
                    </>
                  )}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{money(vehicle.price)}</div>
                  {margen && (
                    <div
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: margen.tono, fontWeight: 600 }}
                    >
                      {margen.texto}
                    </div>
                  )}
                  <div>
                    <span style={pillStyle(adminVehicleStatus[vehicle.status], dark)}>
                      {adminVehicleStatus[vehicle.status].label}
                    </span>
                  </div>
                  {escribe && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => openEdit(vehicle)} style={ACTION_BUTTON}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(vehicle)}
                        style={{ ...ACTION_BUTTON, color: 'var(--danger)' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {status === 'ready' && vehicles.length > 0 && isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {vehicles.map((vehicle) => {
              const margen = margenVisible(vehicle);
              return (
                <div
                  key={vehicle.id}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {vehicle.brand} {vehicle.model}
                    </div>
                    <span style={pillStyle(adminVehicleStatus[vehicle.status], dark)}>
                      {adminVehicleStatus[vehicle.status].label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                    {vehicle.year} · {kilometersShort(vehicle.mileage)}
                    {margen && (
                      <>
                        {' · Margen pot. '}
                        <span style={{ color: margen.tono, fontWeight: 600 }}>{margen.texto}</span>
                      </>
                    )}
                  </div>
                  {escribe && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => openEdit(vehicle)} style={ACTION_BUTTON}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(vehicle)}
                        style={{ ...ACTION_BUTTON, color: 'var(--danger)' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRMACIÓN DE BORRADO */}
      {pendingDelete && (
        <>
          <div
            role="presentation"
            onClick={() => setPendingDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,15,13,0.5)', zIndex: 96 }}
          />
          <div
            role="dialog"
            aria-label="Eliminar vehículo"
            className="slide-up"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 97,
              width: 'min(420px, calc(100vw - 32px))',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: 24,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
              ¿Eliminar {pendingDelete.brand} {pendingDelete.model}?
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>
              El vehículo sale del stock y de la publicación. No se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                style={{ ...ACTION_BUTTON, padding: '10px 16px', fontSize: 13 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#FFFFFF',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </>
      )}

      {/* DRAWER */}
      {drawerOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setDrawerOpen(false)}
            className="fadein"
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,15,13,0.4)', zIndex: 90 }}
          />
          <div
            role="dialog"
            aria-label="Vehículo"
            className="slide-in-right"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(560px, 100vw)',
              background: 'var(--card)',
              zIndex: 91,
              overflowY: 'auto',
              borderLeft: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                position: 'sticky',
                top: 0,
                background: 'var(--card)',
                zIndex: 2,
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>
                {form.id ? 'Editar vehículo' : 'Nuevo vehículo'}
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <button type="button" onClick={() => setDrawerTab('datos')} style={tabStyle(drawerTab === 'datos')}>
                Datos
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('gastos')}
                style={tabStyle(drawerTab === 'gastos')}
              >
                Gastos y rentabilidad
              </button>
            </div>

            {drawerTab === 'datos' && (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={GROUP_LABEL}>Identidad</div>
                  <div style={FORM_GRID}>
                    <AutocompleteField
                      label="Marca"
                      kind="name"
                      required
                      variant="panel"
                      suggestions={CAR_BRANDS}
                      value={form.brand}
                      onChange={setFormValue('brand')}
                      showError={showErrors}
                    />
                    <AutocompleteField
                      label="Modelo"
                      variant="panel"
                      required
                      suggestions={modelSuggestions}
                      value={form.model}
                      onChange={setFormValue('model')}
                      showError={showErrors}
                    />
                    <AutocompleteField
                      label="Versión"
                      variant="panel"
                      suggestions={versionSuggestions}
                      value={form.version}
                      onChange={setFormValue('version')}
                    />
                    <TextField
                      label="Año"
                      kind="year"
                      required
                      variant="panel"
                      value={form.year}
                      onChange={setFormValue('year')}
                      showError={showErrors}
                    />
                  </div>
                </div>

                <div>
                  <div style={GROUP_LABEL}>Especificaciones</div>
                  <div style={FORM_GRID}>
                    <TextField
                      label="Motor"
                      variant="panel"
                      value={form.engine}
                      onChange={setFormValue('engine')}
                    />
                    <LabeledSelect
                      label="Combustible"
                      value={form.fuel}
                      onChange={setFormField('fuel')}
                      options={FUEL_VALUES}
                    />
                    <LabeledSelect
                      label="Transmisión"
                      value={form.transmission}
                      onChange={setFormField('transmission')}
                      options={TRANSMISSION_VALUES}
                    />
                    <TextField
                      label="Tracción"
                      variant="panel"
                      value={form.traction}
                      onChange={setFormValue('traction')}
                    />
                    <LabeledSelect
                      label="Carrocería"
                      value={form.bodyType}
                      onChange={setFormField('bodyType')}
                      options={BODY_VALUES}
                    />
                    <TextField
                      label="Kilometraje"
                      kind="integer"
                      variant="panel"
                      value={form.mileage}
                      onChange={setFormValue('mileage')}
                    />
                    <TextField
                      label="Color"
                      variant="panel"
                      value={form.color}
                      onChange={setFormValue('color')}
                    />
                  </div>
                </div>

                <div>
                  <div style={GROUP_LABEL}>Comercial</div>
                  <div style={FORM_GRID}>
                    <TextField
                      label="Precio compra"
                      kind="money"
                      variant="panel"
                      value={form.purchasePrice}
                      onChange={setFormValue('purchasePrice')}
                    />
                    <TextField
                      label="Precio publicación"
                      kind="money"
                      required
                      variant="panel"
                      value={form.listingPrice}
                      onChange={setFormValue('listingPrice')}
                      showError={showErrors}
                    />
                    <LabeledSelect
                      label="Estado"
                      value={form.status}
                      onChange={setFormField('status')}
                      options={['available', 'reserved', 'sold']}
                      labels={{ available: 'Disponible', reserved: 'Reservado', sold: 'Vendido' }}
                      allowEmpty={false}
                    />
                  </div>
                </div>

                <div>
                  <div style={GROUP_LABEL}>Descripción</div>
                  <textarea
                    rows={3}
                    placeholder="Descripción del vehículo"
                    value={form.description}
                    onChange={setFormField('description')}
                    style={{ ...FIELD, resize: 'vertical' }}
                  />
                </div>

                <div>
                  <div style={GROUP_LABEL}>Multimedia</div>
                  <div
                    style={{
                      border: '1px dashed var(--border)',
                      padding: 24,
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--muted)',
                    }}
                  >
                    Arrastrá imágenes o hacé clic para elegirlas
                  </div>
                </div>

                {saveButton}
              </div>
            )}

            {drawerTab === 'gastos' && (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={GROUP_LABEL}>Gastos por categoría</div>
                {EXPENSE_KEYS.map((key, index) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label htmlFor={`exp-${key}`} style={{ flex: 1, fontSize: 13 }}>
                      {EXPENSE_LABELS[index]}
                    </label>
                    <input
                      id={`exp-${key}`}
                      value={expenses[key]}
                      inputMode="numeric"
                      maxLength={12}
                      onChange={(event) =>
                        setExpenses((prev) => ({
                          ...prev,
                          [key]: event.target.value.replace(/\D/g, '').slice(0, 12),
                        }))
                      }
                      style={{ ...FIELD, width: 120, textAlign: 'right' }}
                    />
                  </div>
                ))}

                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    marginTop: 8,
                    paddingTop: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Precio de compra</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{money(purchase)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gastos acumulados</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{money(totalExpenses)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Inversión total</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{money(totalInvestment)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Precio publicado</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{money(listing)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: marginTone(potentialMargin),
                      fontWeight: 700,
                    }}
                  >
                    <span>Margen potencial</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{money(potentialMargin)}</span>
                  </div>
                  {potentialMargin < 0 && (
                    <div
                      role="alert"
                      style={{
                        background: 'var(--danger-soft)',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        fontSize: 12,
                        padding: '10px 12px',
                      }}
                    >
                      La inversión supera al precio publicado: este vehículo se vendería a pérdida.
                    </div>
                  )}
                </div>

                {/* Se guarda desde acá: no hace falta volver a la pestaña de datos. */}
                {saveButton}
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}

const FORM_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
  gap: 12,
};

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  labels?: Record<string, string>;
  allowEmpty?: boolean;
}

/** Select con etiqueta. Cierra el dominio de los campos que la API valida. */
function LabeledSelect({ label, value, onChange, options, labels, allowEmpty = true }: LabeledSelectProps) {
  const id = `sel-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 6 }}
      >
        {label}
      </label>
      <select id={id} value={value} onChange={onChange} style={FIELD}>
        {allowEmpty && <option value="">Sin definir</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </div>
  );
}
