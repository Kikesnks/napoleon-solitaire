# Solitario Napoleón

**Implementación web del solitario Napoleón, con el motor de reglas desacoplado de la interfaz, validación anti-trampas en servidor y empaquetado para portales y para móvil.**

Jugable en **[n-solitaire.vercel.app](https://n-solitaire.vercel.app)**

## Qué es

Versión jugable en navegador del solitario clásico de dos barajas, siguiendo el reglamento del PDF de referencia ([`docs/esquemas/esquema_solitario_napoleon.pdf`](./docs/esquemas/esquema_solitario_napoleon.pdf)). React + TypeScript + Vite, con toda la lógica del juego escrita en TypeScript puro: sin React, sin DOM y sin efectos.

El interés técnico del proyecto está en tres decisiones que atraviesan todo el código:

- **El motor es una función pura y determinista.** Dada una semilla y una lista de acciones, el estado resultante es siempre el mismo. Esto no es purismo: es lo que hace posibles las otras dos.
- **El servidor no se fía del cliente.** Las puntuaciones se validan reproduciendo la partida entera con el mismo motor antes de aceptarlas.
- **Lo reutilizable está separado de lo específico.** El ranking, el almacenamiento y la internacionalización no saben nada del Napoleón.

## Autoría y proceso de construcción

**Autor: Kike.** El proyecto se construye con Claude Code como herramienta de implementación, bajo especificaciones aprobadas previamente.

**El rol del autor:**

- **Diseño del producto y de la experiencia**: disposición del tablero fiel a la página 9 del PDF original, flujo de arranque (reglas → elección de palos → juego) y comportamiento de la interacción.
- **Decisiones de arquitectura**: separar el motor puro de la UI para poder portarlo con Capacitor; validar las puntuaciones reproduciendo la partida en el servidor en vez de confiar en el cliente; reutilizar ese mismo mecanismo para persistir la partida; separar `core/` (reutilizable) de `game/` (las reglas concretas).
- **Especificaciones funcionales**: qué debe hacer el sistema, qué no, y por qué. Cada ronda de trabajo parte de una especificación escrita y aprobada.
- **Testeo y validación**: pruebas manuales en portátil y en móvil real, en vertical y apaisado, en los tres idiomas. La mayoría de los fallos corregidos —y los más difíciles— salieron de ahí, no de los tests automáticos: el tablero recortado en apaisado, el marcador solapado, la animación de reparto que parecía reiniciar la partida.
- **Criterio técnico**: qué se implementa, qué se pospone y qué se descarta.

**El rol de Claude Code (IA):** escribir el código bajo esas especificaciones. Cada tarea lleva un conjunto de pruebas documentado —qué prueba, cómo y con qué resultado— que debe pasar antes de darse por buena.

### Dos principios que se aplican en todo el código

1. **Lo genérico se separa de lo específico.** Todo lo que no sean las reglas del Napoleón se escribe como pieza reutilizable desde el primer día: más esfuerzo la primera vez, una sola vez.
2. **Cero recopilación de datos.** El juego no instala cookies, no crea perfiles y no envía nada a terceros. Y no es una promesa: es una propiedad que el pipeline de tests verifica en cada ejecución (ver [Privacidad](#privacidad)).

## Stack

- React 18 + TypeScript + Vite
- Motor de reglas en TypeScript puro, determinista, con PRNG sembrado (`mulberry32`)
- Vercel Functions + Supabase para el ranking global
- Playwright para los tests de layout, funcionales y de build embebido
- Capacitor preconfigurado para el empaquetado nativo

Sin librerías de UI de terceros. El bundle embebible pesa **72 KB comprimido**.

## Estado actual

**138 comprobaciones** en verde: motor, ranking, layout en 12 viewports, funcionales en navegador y build embebido. `npm test` encadena el pipeline completo.

### Motor de reglas

`src/game/` implementa el reglamento entero como función pura:

- 2 barajas francesas (104 cartas), con modo alternativo de **2 palos**.
- Fundaciones **I/II/III/IV** descendentes de K a A y fundación **X** ascendente de A a K; al completarse se retiran y dejan el hueco libre.
- **Free cells A1/B1/C1/D1** con stacking ascendente del mismo palo, reposición automática desde su pila A/B/C/D asociada y volteo de la siguiente carta tapada.
- Encadenado a fundación: *"se colocan todas las que haya en orden"*.
- Reparto por rondas 4→3→2→1, con recolección 1→2→3→4 entre rondas.
- Deshacer completo, incluido el de un encadenado: un solo paso de historial pese a N movimientos físicos.

Al no depender de React ni del DOM, cualquier framework de tests puede importar `src/game/index.ts` y ejecutar partidas deterministas pasando una `seed`. Un solver o una IA partirían del mismo motor sin tocarlo.

### Interfaz

- **Tablero en cruz** fiel a la página 9 del PDF, con B/B1/D/D1 en horizontal. Cabe entero en pantalla **sin scroll** en cualquier tamaño.
- **Arrastrar y soltar** con Pointer Events: idéntico en ratón, táctil y lápiz.
- **Promoción por toque**, siempre manual. Nunca se mueve nada por su cuenta.
- **Tres idiomas** (español, inglés y francés) con detección por navegador e inglés por defecto.
- **La partida sobrevive a recargar la página.**
- Política de privacidad accesible desde el juego; reglas solo en la primera visita y disponibles en todo momento.

### Ranking global

Tabla separada para partidas ganadas y para partidas terminadas sin ganar, persistida en Supabase a través de funciones serverless. Si el backend no responde —o no existe, como en un build embebido— cae al ranking local **sin mostrar ningún error técnico al jugador**.

### Pendiente

- PWA instalable y modo sin conexión.
- Empaquetado para Google Play vía Capacitor.
- Traducciones a japonés y chino tradicional; el inglés cubre esos idiomas mientras tanto.

## Arquitectura

La separación entre **el mecanismo y el juego concreto** es deliberada: lo reutilizable vive en `src/platform/` y `src/core/` y no conoce el Napoleón; `src/game/` es la atadura.

La dependencia va siempre en un solo sentido —`game/` usa la base común, la base común no sabe que existe el Napoleón— y **eso lo vigila un test**: `npm run test:architecture` analiza los imports y falla si alguien cruza la frontera.

```
src/
  platform/                ← DÓNDE corre el juego. Reutilizable.
    types.ts               ← Interfaz Platform + capacidades declaradas.
    detect.ts              ← Qué adaptador toca, en tiempo de ejecución.
    adapters/web.ts        ← Dominio propio: backend y ranking global.
    adapters/portal.ts     ← Dominio ajeno: sin backend, ranking local.

  core/                    ← Reutilizable. No conoce el Napoleón.
    daily/                 ← Reto diario: semilla por fecha, racha y resultados.
    leaderboard/
      types.ts             ← Contrato del backend.
      remote.ts            ← Servidor HTTP.
      local.ts             ← localStorage.
      index.ts             ← Fachada con respaldo automático remoto → local.
    storage/prefs.ts       ← localStorage que no revienta si está deshabilitado.

  game/                    ← TypeScript puro. Las reglas del Napoleón.
    types.ts               ← Card, PositionId, GameState…
    deck.ts                ← Construcción y barajado (PRNG sembrado).
    state.ts               ← Estado inicial y snapshot.
    rules.ts               ← Validación, movimientos, encadenado, repartos, puntuación.
    save.ts                ← Guardado por semilla + registro de acciones.
    leaderboard.ts         ← Atadura del Napoleón a core/leaderboard.
    daily.ts               ← Atadura del Napoleón a core/daily.
    daily-seeds.ts         ← Tabla de semillas del reto. Archivo de datos.

  hooks/
    useGameEngine.ts       ← Estado, dispatch, deshacer y persistencia.
    useDragDrop.ts         ← Arrastre y toque con Pointer Events.
    useFitBoard.ts         ← Mide el hueco real y ajusta el tamaño de carta.
    useTimer.ts            ← Cronómetro.

  components/              ← UI.
  i18n/                    ← Textos y detección de idioma (ES / EN / FR).
  styles/index.css         ← Tablero en cruz con CSS Grid.

api/                       ← Funciones serverless: leaderboard/ y keepalive.
scripts/                   ← Tests, capturas y empaquetado.

docs/                      ← Toda la documentación. La raíz solo lleva README y RULES.
  esquemas/                ← Reglamento gráfico original (PDF / ODP). Versionado.
  tecnica/                 ← Documentación técnica reutilizable. Versionada.
  vivos/                   ← Planes de trabajo en curso.      ⟶ fuera del repo
  informes/                ← Investigación y estrategia.      ⟶ fuera del repo
  notas/                   ← Notas de trabajo del autor.      ⟶ fuera del repo
```

Las tres últimas carpetas quedan fuera del repositorio por `.gitignore` **a nivel de carpeta**, no por nombre de archivo: así el filtro no se rompe si alguien renombra un documento.

### La capa de plataforma

El mismo juego corre en sitios que no se parecen: nuestro dominio, un portal ajeno, y mañana la app de Android. Cada uno guarda las puntuaciones en otro sitio, sirve otros anuncios y exige otras llamadas. En vez de repartir `if (estamos en tal portal)` por los componentes, hay **una interfaz y un adaptador por destino**, elegido al arrancar.

La clave está en las **capacidades declaradas**: el juego nunca pregunta *¿estoy en CrazyGames?*, sino *¿hay anuncio recompensado?*. Así, añadir un portal es escribir un adaptador y no revisar la interfaz.

```ts
const platform = getPlatform();                                  // main.tsx
configureLeaderboard({ remoteBaseUrl: platform.leaderboard.remoteBaseUrl });
```

`main.tsx` es el único sitio que conoce los dos lados: `platform/` no sabe que existe el Napoleón y `game/` no sabe dónde está corriendo. Antes, `game/leaderboard.ts` leía la variable de build `VITE_TARGET` para decidir si había backend; ahora esa decisión la aporta la plataforma.

### El reto diario

Una partida idéntica para todo el mundo cada día, que sale casi gratis porque el motor es determinista: basta con fijar la semilla. Hay **dos retos por día**, uno de 2 palos y otro de 4.

La semilla sale de una **tabla de datos** (`daily-seeds.ts`) y, para cualquier día que no esté en ella, se **deriva de la propia fecha** con un FNV-1a. Así el reto nunca falta aunque la tabla esté vacía, y la tabla queda como contrato para el solver que la validará más adelante.

Tres detalles que no son obvios:

- **La fecha es local, no UTC.** La racha es del jugador, no del meridiano de Greenwich.
- **El día anterior se calcula construyendo la fecha a mediodía.** Restar 24 horas se tuerce en los cambios de hora, y una racha no puede romperse porque el país haya adelantado el reloj.
- **Que la partida en curso sea el reto de hoy se deduce de la semilla**, sin guardar ninguna marca ni añadir un campo al estado del motor.

La racha cuenta **días jugados**, no victorias: en un solitario de dos barajas, una racha que solo contara victorias sería un cero permanente.

> Ningún texto de la interfaz promete que el reto del día tenga solución. Mientras el solver no valide las semillas, puede no tenerla — y prometerlo sería justo la clase de promesa que destruye la confianza en la función que existe para que el jugador vuelva mañana.

### La fachada del ranking

Es el ejemplo más claro del patrón. `createLeaderboard()` devuelve un objeto que **nunca lanza**: intenta el backend remoto y, si falla por cualquier motivo —red caída, 404, JSON inválido, `localStorage` bloqueado—, sirve el local. El juego llama a una sola función y no ve un error jamás.

```ts
async function withFallback(run: (b: Backend) => Promise<Entry[]>): Promise<Entry[]> {
  if (remote) {
    try { const entries = await run(remote); scope = "global"; return entries; }
    catch { scope = "local"; }
  }
  try { return await run(local); } catch { return []; }
}
```

### Distinguir un toque de un arrastre

La promoción de cartas se dispara al tocarlas, pero **no** se escucha el evento `click`. Por el *pointer capture*, el navegador lo dispara sobre la carta de origen también al final de un arrastre que no llega a destino: escuchándolo, cada arrastre fallido movería la carta. El toque se detecta en `useDragDrop` midiendo la distancia recorrida entre `pointerdown` y `pointerup`, con un umbral de 8 px.

### Ajustar el tablero al hueco real

El CSS calculaba el tamaño de carta restando a `100svh` una altura de cabecera *estimada*. En cuanto la cabecera real no medía eso —otro idioma con botones más largos, otra barra de navegador—, el tablero salía más alto que su contenedor y, sin scroll, la última fila desaparecía recortada.

`useFitBoard` mide el contenedor con un `ResizeObserver` y escribe sus dimensiones en dos variables CSS. Misma fórmula, dato real: se acaban las suposiciones sobre cabecera, barra de URL, *safe areas* o el `svh` de cada navegador.

## Instalación

```bash
git clone https://github.com/Kikesnks/napoleon-solitaire.git
cd napoleon-solitaire
npm install
```

```bash
npm run dev              # Vite en http://localhost:5173
npm run build            # dist/ — la web y el empaquetado con Capacitor
npm run build:portal     # dist-portal/ — build embebible, sin backend ni sourcemap
npm run preview          # sirve el bundle de producción
npm run preview:portal   # sirve el build embebible, accesible desde el móvil
```

No hace falta ninguna clave de API para jugar en local: sin backend, el ranking funciona en modo local.

## Controles

- **Tap o clic** sobre una carta: la sube a una fundación si encaja en alguna. **Nunca se mueve nada solo**: si la carta vale para más de una fundación, se arrastra para elegir destino.
- **Arrastrar** (ratón o táctil): soltar sobre cualquier free cell o fundación válida.
- **Tap en el montón** o **Espacio**: reparte la siguiente tirada. Con el montón vacío, recoge las pilas y avanza de ronda.
- **Botón ↶ Deshacer** o tecla **U**: revierte el último movimiento, incluido el reparto.
- **Botón 📖 Reglas** y **botón 🔒 Privacidad**: accesibles desde el HUD en todo momento.
- **Botón ✚ Nueva**: nueva partida, eligiendo antes 2 o 4 palos.
- **`Esc`**: cierra el diálogo que esté abierto, empezando por el de encima.

## Puntuación

| Acción                          | Puntos |
|---------------------------------|--------|
| Carta colocada en una fundación | +10    |
| Completar una fundación         | +50    |
| Mover entre free cells          | −1     |

## Privacidad

El juego no recopila ninguna información sobre el jugador: sin cuentas, sin registro, sin perfilado. No instala cookies, ni propias ni de terceros.

Lo único que se guarda —y se queda en el dispositivo— son cinco claves bajo el prefijo `solnap.`: idioma, dificultad elegida, si ya se vieron las reglas, la partida en curso y el ranking local.

Lo interesante es que **es comprobable**. `test:portal` verifica en cada ejecución que no se crea ni una cookie, que no sale ni una petición a un dominio ajeno y que en `localStorage` no aparece ninguna clave que no sea nuestra. Si alguien introdujera un rastreador, el pipeline se pondría en rojo.

## Tests

```bash
npm test                    # pipeline completo
npm run test:architecture   # la frontera entre base común y juego
npm run test:smoke          # solo el motor (puro, ~50 ms)
npm run test:daily          # reto diario: semillas, racha y sin almacenamiento
npm run test:leaderboard    # el ranking nunca enseña errores técnicos
npm run test:layout         # 12 viewports en chromium headless, sin scroll
npm run test:functional     # interacción real en navegador
npm run test:portal         # el build embebido, servido sin backend
npm run test:screenshots    # regenera las capturas
```

- **`test:architecture`** analiza los imports y falla si `core/` o `platform/` importan del juego, si `game/` importa de `platform/` o de React, o si alguien vuelve a leer el destino del build desde dentro del juego. Comprueba además que cada adaptador declara lo que debe. Es el guardián del principio que abarata el siguiente solitario: sin él, la frontera se erosiona sola.

- **`test:smoke`** cubre la disposición inicial, `canPlace` en todos los destinos, el encadenado, la reposición de free cells, el reparto y las rondas, el deshacer, y dos regresiones concretas: la del *snapshot shallow* (tras 3 repartos y 3 deshacer, todas las cartas del montón siguen boca abajo — antes el snapshot copiaba solo el array y el reparto mutaba `faceUp` en sitio, contaminando los estados archivados) y la de la promoción manual desde cualquier origen válido.

- **`test:daily`** inyecta un almacenamiento de mentira para poder simular días seguidos, saltos de día y cambios de mes y de año sin tocar el reloj del sistema. Comprueba que el mismo día da siempre el mismo reparto, que 2 y 4 palos son retos distintos, que la racha suma, se corta y conserva su récord, y que **con el almacenamiento roto no lanza nada**: ese último caso destapó un fallo real —el módulo daba por hecho que el almacenamiento inyectado nunca falla— antes de que llegara a producción.

- **`test:layout`** confirma que el tablero **cabe sin scroll** en 12 viewports —de 320 px a 1920 px, en vertical y apaisado, en español y en francés— y que las 18 pilas quedan dentro del contenedor. Comprueba además que los cinco datos del marcador caben enteros, **forzando el cronómetro a `888:88`**: con el reloj recién arrancado cabría en cualquier sitio y la prueba no demostraría nada.

- **`test:functional`** abre la app en chromium y recorre el flujo real: primera visita, cambio de idioma, animación de reparto, el bug histórico del deshacer, la alineación del diagrama de las reglas y el contraste del enlace a la política.

- **`test:portal`** sirve `dist-portal/` desde una subcarpeta con `/api` devolviendo 404 —el entorno de un juego embebido en un dominio ajeno— y comprueba que se juega igual, que el ranking no filtra errores, que la detección de idioma funciona en siete locales y que se cumple la promesa de privacidad.

Los tests de navegador levantan un `vite preview` al vuelo desde `scripts/preview-server.ts`, con puerto estricto y parada del árbol de procesos completo. Sin lo primero, un preview huérfano acaba escuchando en el puerto de otro test; sin lo segundo, en Windows `kill` mata el intérprete y deja vivo el proceso que escucha.

## Ranking global (Supabase + Vercel)

Los scores se envían a funciones serverless que **reproducen la partida con el mismo motor de reglas** antes de aceptar la inserción: un cliente manipulado no puede publicar puntuaciones falsas.

### Anti-trampas

Cada partida guarda la **semilla** del PRNG, el modo de palos y un **registro de acciones** (`move` / `deal` / `autoPromote`). Al enviar al ranking, el payload incluye los tres. El servidor instancia el motor con esa semilla y reproduce el registro paso a paso; solo si el estado y la puntuación simulados coinciden con los declarados, se inserta.

Funciona porque `mulberry32` se siembra con el mismo entero y el motor es función pura de su entrada. El mismo mecanismo se reutiliza para **guardar la partida en curso**: no se serializa el tablero, se replica desde la semilla, así que no existen dos representaciones del estado que puedan descuadrarse.

### Configuración

1. Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta [`supabase/schema.sql`](./supabase/schema.sql) en el SQL Editor (tabla, índices y políticas RLS).
2. En Vercel, importa el repositorio y añade las variables de entorno `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (Project → Settings → API). La `service_role` salta RLS: solo se usa desde el backend, nunca desde el cliente.
3. Deploy. Vercel detecta Vite y las funciones bajo `api/` automáticamente.

Un cron diario (`/api/keepalive`) evita que el plan gratuito de Supabase pause el proyecto por inactividad.

## Build embebible

`npm run build:portal` genera `dist-portal/`: el mismo juego con `VITE_TARGET=portal`, que desactiva el ranking remoto y deja el bundle sin sourcemap. Pensado para servirse desde una subcarpeta de un dominio ajeno, donde el backend no existe. `npm run pack:portal` valida los límites habituales de un portal (número de archivos y tamaño) y produce el `.zip`.

Rutas relativas mediante `base: "./"`, que es también lo que necesita el empaquetado con Capacitor.

## Empaquetar con Capacitor

El proyecto está preconfigurado en `capacitor.config.ts`.

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
npm run build
npm run cap:add:android      # requiere Android Studio
npm run cap:add:ios          # requiere Xcode
npm run cap:sync             # tras cada build
```

## Reglamento

Para el reglamento completo y comentado, ver [`RULES.md`](./RULES.md).

```bash
npm run docs:pdf
```

Toma el contenido de [`docs/esquemas/esquema_solitario_napoleon.original.pdf`](./docs/esquemas/esquema_solitario_napoleon.original.pdf) y produce el PDF con un anexo que recoge las reglas adicionales: visualización horizontal de B/B1/D/D1 y stacking ascendente en free cells.
