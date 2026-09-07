import { NextResponse } from 'next/server';
import { listVehicles, toPublicVehicle } from '@/server/store';
import {
  bodyTypeOptions,
  brandOptions,
  fuelOptions,
  transmissionOptions,
} from '@/server/data/vehicles';
import type { VehicleSort } from '@/types';

const SORTS: VehicleSort[] = ['featured', 'recent', 'price_asc', 'price_desc', 'km_asc'];

/** Catálogo público: stock sin datos de costo, más las opciones de filtro. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sortParam = params.get('sort');
  const sort = SORTS.includes(sortParam as VehicleSort) ? (sortParam as VehicleSort) : 'featured';

  const priceMaxRaw = Number.parseInt(params.get('priceMax') ?? '', 10);

  const vehicles = listVehicles({
    brand: params.get('brand') ?? undefined,
    bodyType: params.get('bodyType') ?? undefined,
    fuel: params.get('fuel') ?? undefined,
    transmission: params.get('transmission') ?? undefined,
    search: params.get('search') ?? undefined,
    featured: params.get('featured') === 'true',
    priceMax: Number.isFinite(priceMaxRaw) && priceMaxRaw > 0 ? priceMaxRaw : undefined,
    sort,
  }).map(toPublicVehicle);

  return NextResponse.json({
    vehicles,
    total: vehicles.length,
    options: {
      brands: brandOptions,
      bodyTypes: bodyTypeOptions,
      fuels: fuelOptions,
      transmissions: transmissionOptions,
    },
  });
}
