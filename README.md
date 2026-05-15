# Solitario Napoleón

Implementación web del solitario Napoleón siguiendo las reglas del PDF de
referencia (`Esquema_solitario_Napoleon.pdf`). React + TypeScript + Vite, con
la lógica del juego completamente desacoplada de la UI para que sea fácil
empaquetar el resultado como app nativa con [Capacitor](https://capacitorjs.com/).

## Reglas implementadas

- 2 barajas francesas (104 cartas).
- Disposición inicial: **4 pilas A/B/C/D de 9 cartas boca abajo con la
  superior boca arriba**, 4 cartas A1/B1/C1/D1 boca arriba (sacadas de la
  cima de cada A/B/C/D) y un montón de 64.
- Fundaciones I/II/III/IV descendentes desde K hasta A — al llegar al As la
  fundación se retira y queda libre para otro K.
- Fundación X ascendente desde A hasta K — al llegar al K se retira.
- **Free cells A1/B1/C1/D1**:
  - Si están vacías aceptan **cualquier** carta boca arriba.
  - Si tienen cartas, **aceptan otra del mismo palo y color en orden
    ascendente** (rango = top + 1). Sirven como buffers ascendentes que luego
    pueden encadenarse a una fundación descendente.
  - Al vaciarse, la pila A/B/C/D asociada repone la free cell y voltea la
    siguiente carta tapada.
- **Visualización de B, B1, D, D1**: estas posiciones se pintan en
  orientación horizontal (cartas tumbadas), siguiendo el esquema del PDF
  original. Al arrastrarlas, el overlay flotante vuelve a orientación
  natural (portrait).
- Reparto por rondas: 4 cartas en ronda 1, 3 en ronda 2, 2 en ronda 3, 1 en
  ronda 4. Entre rondas las pilas se recogen 1→2→3→4 y se voltea boca abajo.
- Encadenado A1/B1/C1/D1/X → fundación: una vez disparado el primer movimiento,
  las cartas que ya estaban en origen y siguen encajando se promueven juntas
  (regla del PDF: "se colocan todas las que haya en orden").
- Detección de victoria: tablero vacío. Derrota: ronda 4, montón vacío y
  cartas restantes.

Para el reglamento completo y comentado, ver [`RULES.md`](./RULES.md). El
PDF original (`Esquema_solitario_Napoleon.pdf`) se ha actualizado con un
anexo que incluye estas reglas adicionales.

## Estructura

```
src/
  game/              ← Pura TypeScript, sin React. Portable.
    types.ts         ← Card, PositionId, GameState…
    deck.ts          ← Construir + barajar las 2 barajas (PRNG opcional).
    state.ts         ← Estado inicial + snapshot.
    rules.ts         ← Validación, movimientos, encadenado, repartos, score.
    index.ts         ← Re-exports.
  hooks/             ← Wrappers React.
    useGameEngine.ts ← Estado + dispatch + undo.
    useTimer.ts      ← Cronómetro.
    useDragDrop.ts   ← Drag & drop con Pointer Events (mouse/touch/pen).
  components/        ← UI.
    Board.tsx
    CardView.tsx
    PileView.tsx
    HUD.tsx
    GameOverlay.tsx
  styles/index.css   ← Layout en cruz con CSS Grid; card-w se calcula con
                      clamp + min(altura, ancho) para que TODO el tablero
                      quepa en una sola pantalla sin scroll. Layout basado
                      en página 9 del PDF (POSICION DE TODAS LAS CARTAS II).
  App.tsx, main.tsx
```

La lógica en `src/game/` no importa React ni el DOM. Si en el futuro quieres
una IA o un solver, parten del mismo motor.

## Ejecutar en local

```bash
npm install
npm run dev      # Vite en http://localhost:5173
npm run build    # produce dist/ listo para Capacitor
npm run preview  # sirve el bundle de producción
```

## Empaquetar con Capacitor

El proyecto está pre-configurado en `capacitor.config.ts`.

```bash
# Una sola vez, instalar Capacitor:
npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios

# Construir el bundle web:
npm run build

# Añadir plataformas (requiere Android Studio / Xcode):
npm run cap:add:android
npm run cap:add:ios

# Sincronizar tras cada build:
npm run cap:sync

# Abrir en IDE nativo:
npx cap open android
npx cap open ios
```

## Pantalla de instrucciones

Al primer arranque (o al pulsar el botón **📖** del HUD) aparece un modal con
las reglas completas y un toggle **ES / EN** en la esquina. La elección de
idioma se persiste en `localStorage` (`solnap.lang`) y afecta al HUD y al
overlay de fin de partida. Para saltarse las instrucciones basta con pulsar
**Empezar a jugar / Start playing**; tras la primera vez ya no se vuelven a
mostrar automáticamente — pero quedan accesibles desde el HUD en cualquier
momento. Tecla `Esc` también cierra el modal.

## Controles

- **Tap / clic** sobre una carta: intenta promoverla a una fundación.
- **Drag** (ratón o táctil): la suelta sobre cualquier free cell o fundación
  válida.
- **Tap en el montón**: reparte la siguiente tirada (4/3/2/1 según ronda).
  Cuando el montón está vacío, recoge las pilas y entra en la siguiente ronda.
- **Botón 📖**: abre la pantalla de instrucciones en cualquier momento.
- **Botón Deshacer** o tecla **U**: revierte el último movimiento (incluido
  el reparto del montón).
- **Espacio**: atajo del reparto.
- **Botón Nueva**: reinicia con un mazo nuevo.

## Puntuación

| Acción                            | Puntos |
|-----------------------------------|--------|
| Carta colocada en una fundación   | +10    |
| Completar una fundación           | +50    |
| Mover entre free cells            | -1     |

## Tests

```bash
npm test                    # typecheck + smoke + build + layout + funcional
npm run test:smoke          # solo motor (puro, ~50ms)
npm run test:layout         # 6 viewports en chromium headless, sin scroll
npm run test:functional     # bug del undo + interacción real en navegador
```

`npm test` lanza el pipeline completo. Los tests de layout y funcional usan
Playwright contra un `vite preview` levantado al vuelo. Los tres bloques:

- `test:smoke` (`scripts/smoke.ts`) cubre:
  - Disposición inicial (104 cartas, 9 en cada A-D, 1 en cada A1-D1, 64 en montón).
  - `canPlace` para fundaciones descendentes/ascendente y la regla de free
    cells (acepta cualquier carta si vacía; ascendente del mismo palo si
    ocupada).
  - Encadenado de A1 con stack ascendente a fundación I-IV.
  - Reposición tras vaciar A1, volteo de la nueva top de A.
  - `dealFromMonton`, `advanceRound` (recolección 1→2→3→4 y vuelta).
  - `undo` (incluido undo de un encadenado completo: un solo paso del
    history a pesar de N moves físicos).
  - **Regresión "snapshot shallow"**: tras 3 deals + 3 undos, todas las
    cartas del montón siguen boca abajo (antes el snapshot copiaba sólo el
    array y `dealFromMonton` mutaba `faceUp` en sitio, contaminando los
    estados archivados en `history`).

- `test:layout` (`scripts/layout-test.ts`) confirma que el tablero **cabe en
  pantalla sin scroll** en 6 viewports (iPhone SE, Pixel, iPhone landscape,
  iPad, laptop 1366×768, escritorio 1920×1080) y que las 18 pilas están
  dentro del viewport.

- `test:functional` (`scripts/functional-test.ts`) abre la app en chromium
  headless, hace 3 deals, 3 undos, y verifica que el top del montón vuelve a
  ser `.card--back` (boca abajo) y que el HUD reporta las 64 cartas. Es la
  prueba en navegador real del bug del undo.

La lógica del juego es función pura: cualquier framework de tests adicional
(Vitest, Jest) puede importar desde `src/game/index.ts` y ejecutar
partidas deterministas pasando una `seed` a `createInitialState`.

## Leaderboard global (Supabase + Vercel)

El leaderboard se persiste en una base de datos remota. Los scores se envían a
endpoints serverless en Vercel que **replican la partida con el mismo motor
de reglas** antes de aceptar la inserción — así un cliente manipulado no puede
publicar puntuaciones falsas.

### 1. Supabase

1. Crea un proyecto en https://supabase.com (gratis).
2. Project → SQL Editor → ejecuta el contenido de
   [`supabase/schema.sql`](./supabase/schema.sql) (crea la tabla, los índices
   y las políticas RLS).
3. Project → Settings → API: copia la **Project URL** y la **service_role
   secret**. La service_role salta RLS — sólo se usa desde el backend.

### 2. Vercel

1. Crea un proyecto en https://vercel.com importando este repositorio.
2. Project → Settings → Environment Variables → añade:
   - `SUPABASE_URL` = la URL del paso 1.
   - `SUPABASE_SERVICE_ROLE_KEY` = la service_role del paso 1.
3. Deploy. Vercel detecta automáticamente Vite + las funciones bajo `api/`.

Una vez desplegado, la app web sirve el bundle de Vite en `/` y los endpoints
`/api/leaderboard/list` (GET) y `/api/leaderboard/submit` (POST). El cliente
los consume internamente.

### Anti-trampas: ¿cómo funciona la validación?

- Cada partida guarda en su estado: la **semilla** del PRNG inicial, el modo
  de palos (2 o 4) y un **log de acciones** (`move`/`deal`/`autoPromote`).
- Al enviar al leaderboard, el payload incluye esos tres campos.
- En el servidor, `api/leaderboard/submit.ts` instancia el motor con la misma
  semilla y modo y reproduce el log paso a paso.
- Sólo si el `status` y `score` del estado simulado coinciden con los del
  payload, se inserta en Supabase.

Los movimientos siguen siendo deterministas porque `mulberry32` se siembra
con el mismo entero y el motor es pura función de su input.

## Regenerar el PDF de reglas

```bash
npm run docs:pdf
```

Toma el contenido original de `Esquema_solitario_Napoleon.original.pdf`
(backup automático) y produce `Esquema_solitario_Napoleon.pdf` con un
anexo que incluye las reglas adicionales (visualización horizontal de
B/B1/D/D1 y stacking ascendente en free cells).
