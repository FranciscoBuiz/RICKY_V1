# Backend — 5848 Motors

Carpeta donde vive el backend del proyecto. Todavía sin código: el stack se
define antes de empezar.

Hoy la lógica de datos vive en el frontend, en `frontend/src/server/store.ts`
(store en memoria) y se expone por los route handlers de Next en
`frontend/src/app/api/`. Ese es el contrato que este backend tiene que
reemplazar: mismas rutas, mismas formas de payload (`frontend/src/types/index.ts`).
