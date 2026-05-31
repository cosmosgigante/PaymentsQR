@AGENTS.md

# Sistema QR para Restaurantes — Documentación del Proyecto

## Qué es esto

SaaS multi-tenant de pedidos por QR para restaurantes. El cliente escanea un QR en la mesa, ve el menú digital, arma su pedido y elige cómo pagar:

- **Pagar ahora** — tarjeta o billetera virtual (gateway enchufable, aún no implementado)
- **Pagar en caja al final** — pensado para países como Argentina donde no se acostumbra pagar antes de comer

Inspirado en Australia pero con flujo dual. Arquitectura multi-tenant: cada restaurante tiene su propio slug, mesas y datos.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Base de datos | SQLite (dev) / PostgreSQL (prod) |
| ORM | **Prisma 7** con adapter `@prisma/adapter-better-sqlite3` |
| UI | Tailwind CSS + shadcn/ui + Framer Motion + Lucide React |
| Tiempo real | Server-Sent Events (SSE) — sin dependencias externas |
| Auth | JWT (`jose`) + bcrypt (`bcryptjs`) |
| QR | `qrcode` npm package |

---

## ⚠️ CRÍTICO — Configuración de Prisma 7 (aplica a CUALQUIER máquina: Intel, AMD, ARM)

**Prisma 7 cambió cómo se conecta a la DB en todas las plataformas.** Ya no usa un binario nativo Rust — ahora usa un engine JavaScript puro que requiere un "adapter". Esto no es un tema de arquitectura de CPU, es un cambio de Prisma 7 para todos.

### Por qué NO volver a Prisma 6
Prisma 6 usa binarios nativos `.dll.node` que pueden no estar disponibles o ser incompatibles. Quedate en Prisma 7 — es el futuro del ORM y evita esos problemas.

### Cómo funciona Prisma 7 en este proyecto

**`prisma/schema.prisma`** — Sin `url` en el datasource (Prisma 7 no lo permite en el schema):
```prisma
datasource db {
  provider = "sqlite"
}
```

**`prisma.config.ts`** — URL para migraciones:
```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: "file:./prisma/dev.db" },
});
```

**`src/lib/db.ts`** — El adapter recibe `{ url }` (NO una instancia de Database):
```typescript
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as any);
```

> **Error frecuente:** `TypeError: Cannot read properties of undefined (reading 'replace')`
> **Causa:** Pasar una instancia `new Database()` al adapter en vez de `{ url: "file:..." }`.
> **Fix:** El adapter crea el Database internamente — solo pasale el URL.

### Comandos Prisma
```bash
npx prisma generate          # Regenerar cliente (correr después de cambios en schema)
npx prisma db push           # Aplicar schema a la DB (dev, sin migraciones)
npx prisma migrate dev       # Crear migración (para cambios en producción)
npx prisma studio            # GUI para ver/editar datos
```

---

## Rutas del sistema

### Cliente (público — escanea el QR)
| Ruta | Descripción |
|------|------------|
| `/mesa/[token]` | Menú digital del cliente. Token = qrToken de la mesa |

### Admin (protegido por JWT cookie)
| Ruta | Descripción |
|------|------------|
| `/setup` | Crear el primer restaurante. Solo funciona una vez. Requiere SETUP_SECRET |
| `/admin/login` | Login del admin |
| `/admin` | Dashboard con stats y pedidos recientes |
| `/admin/menu` | Gestión de categorías y platos |
| `/admin/mesas` | Gestión de mesas + generación y descarga de QRs |
| `/cocina` | Panel de cocina en tiempo real (SSE) |

### API
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/setup` | POST | SETUP_SECRET | Crear restaurante inicial |
| `/api/auth/login` | POST/DELETE | — | Login / Logout |
| `/api/mesa-data` | GET | — | Datos del menú por token de mesa |
| `/api/menu` | GET/POST | JWT | Categorías del menú |
| `/api/menu/items` | POST | JWT | Crear item |
| `/api/menu/items/[id]` | PATCH/DELETE | JWT | Editar/eliminar item |
| `/api/orders` | GET/POST | GET=JWT, POST=token | Pedidos |
| `/api/orders/[id]` | GET/PATCH | GET=token mesa, PATCH=JWT | Ver/actualizar pedido |
| `/api/tables` | GET/POST | JWT | Mesas |
| `/api/tables/[id]` | PATCH/DELETE | JWT | Editar/eliminar mesa |
| `/api/events` | GET (SSE) | JWT | Stream de eventos en tiempo real |

---

## Variables de entorno (.env)

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="dev-secret-change-in-production-min-32-chars-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SETUP_SECRET="gaucho123"   # ← CAMBIAR en producción
```

> En producción: mover todas a las variables de entorno del hosting (Vercel → Settings → Environment Variables).
> El JWT_SECRET debe tener mínimo 32 caracteres aleatorios.
> El SETUP_SECRET puede ser cualquier string — se usa una sola vez para crear el primer restaurante.

---

## Arquitectura del código

```
src/
├── app/
│   ├── mesa/[token]/          # Página del cliente (mobile-first)
│   ├── admin/
│   │   ├── login/             # Login admin
│   │   ├── menu/              # Gestión menú
│   │   └── mesas/             # Gestión mesas + QR
│   ├── cocina/                # Panel cocina (real-time)
│   ├── setup/                 # Setup inicial (una vez)
│   └── api/                   # API routes (backend)
├── components/
│   ├── customer/              # MenuView, CartDrawer, OrderStatus, MobileFrame
│   ├── kitchen/               # KitchenBoard
│   └── admin/                 # AdminDashboard, MenuManager, TablesManager
├── hooks/
│   ├── useCart.ts             # Hook del carrito (reutilizable)
│   └── useSSE.ts              # Hook Server-Sent Events
└── lib/
    ├── db.ts                  # PrismaClient con adapter (ver nota ARM64 arriba)
    ├── auth.ts                # JWT helpers (signToken, getSession)
    ├── api.ts                 # API client centralizado (fetch helpers)
    ├── types.ts               # Todos los tipos TypeScript del dominio
    ├── events.ts              # Sistema SSE en memoria
    └── rateLimit.ts           # Rate limiting en memoria
```

---

## Seguridad implementada

- **Middleware** (`src/middleware.ts`) — protege `/admin/*` y `/cocina` a nivel de edge
- **Rate limiting** — 10 intentos login/IP/15min, 5 pedidos/mesa/2min
- **JWT HttpOnly cookies** — sesión del admin, no accesible desde JS
- **Timing-safe login** — siempre hace bcrypt.compare aunque el usuario no exista
- **Tokens de mesa** — los pedidos solo se ven con el token correcto
- **Setup secret** — el endpoint `/api/setup` requiere un secret del `.env`
- **Headers HTTP** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Validación de inputs** — tipos, límites de cantidad, sanitización de notas

---

## Responsividad / Mobile

Diseñado mobile-first. Fixes específicos para iOS Safari y Android:
- `100dvh` en lugar de `100vh` (fix Safari iOS)
- `env(safe-area-inset-*)` para notch de iPhone
- `font-size: 16px` en inputs (evita zoom automático en iOS)
- `-webkit-backdrop-filter` para blur en Safari
- `touch-action: manipulation` en botones (elimina delay 300ms Android)
- `MobileFrame` — en desktop centra la vista del cliente como si fuera un celular

---

## Estado actual del proyecto

### ✅ Implementado y funcionando
- Setup inicial de restaurante
- Login admin con JWT
- Gestión de menú (categorías + platos)
- Gestión de mesas + generación de QR descargable
- Menú digital para el cliente
- Carrito con control de cantidades
- Flujo dual de pago (en caja / ahora)
- Panel de cocina en tiempo real (SSE)
- Dashboard admin con stats y pedidos recientes
- Seguridad completa
- Mobile-first responsive (Android + iOS Safari)
- Multi-tenant ready

### ⏳ Pendiente para el futuro
- **Gateway de pagos** — estructura enchufable ya lista en `PaymentMode`. Conectar Stripe o Mercado Pago según el país
- **Suscripción SaaS** — planes y cobro mensual por restaurante (Stripe Billing)
- **Onboarding self-service** — que cualquier restaurante pueda crearse sin intervención del developer
- **Multi-idioma** — el menú ya tiene la estructura, falta el selector de idioma
- **Imágenes de platos** — actualmente acepta URLs externas, falta upload propio (Vercel Blob o S3)
- **Sistema de impresión** — enviar pedido a impresora de cocina (protocolo ESC/POS)
- **Cambiar SETUP_SECRET** por algo seguro antes de producción

---

## Cómo correr en local

```bash
cd "C:\Users\ignac\Desktop\pagos con qr\app"
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Luego ir a `http://localhost:3000/setup` y crear el primer restaurante.

---

## Deploy a producción (cuando llegue el momento)

1. Crear proyecto en [Vercel](https://vercel.com)
2. Crear DB en [Neon](https://neon.tech) (PostgreSQL gratis)
3. En `prisma/schema.prisma` cambiar `provider = "postgresql"`
4. En `prisma.config.ts` poner la URL de Neon
5. En `src/lib/db.ts` usar `@prisma/adapter-pg` en vez de `@prisma/adapter-better-sqlite3`
6. Configurar en Vercel todas las variables de entorno
7. `vercel deploy`
