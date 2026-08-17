# Molde para solitarios

> **Qué es esto.** La receta de lo que hay que montar en cada solitario nuevo: qué se reutiliza tal cual, qué se escribe desde cero, en qué orden y con qué trampas conocidas.
> **Para quién.** Lo usa principalmente Claude al arrancar un juego nuevo, pero está escrito para que el propietario lo lea y lo entienda sin ser programador.
> **De dónde sale.** De construir el Solitario Napoleón. Todo lo que hay aquí está probado en un juego real, no es teoría.
> Creado y actualizado: 16 de agosto de 2026 · Sustituye a la idea de una carpeta `MOLDE/` con código copiado (decisión D6).

## Cómo se usa este documento

Es **un solo archivo y no depende de nada**. Para arrancar un solitario nuevo:

```bash
mkdir -p <nuevo-proyecto>/docs/tecnica
cp "docs/tecnica/molde_solitarios.md" <nuevo-proyecto>/docs/tecnica/
```

Se copia **antes de escribir una línea de código** y se sigue el checklist de §11. Cuando el juego nuevo enseñe algo que aquí no está, se añade **en el molde del proyecto nuevo** y se trae de vuelta a este: el documento vale lo que valga la última lección aprendida.

---

## 1. Por qué un documento y no una carpeta con código

La tentación es copiar una carpeta con la estructura hecha. No se hace, por tres razones:

1. **Una copia que nadie ejecuta nace muerta.** En cuanto se toca el original, la copia se queda atrás y acabas con dos versiones del mismo ranking sin saber cuál vale.
2. **Estorba**: entra en la comprobación de tipos, en el empaquetado y en las búsquedas, sin aportar nada.
3. **Una pieza común extraída sin un segundo juego real se diseña a ciegas.** Es el segundo solitario el que dice qué era común de verdad y qué era del Napoleón disfrazado.

**El plan es este:** este documento guía el juego nº 2. Cuando el nº 2 esté funcionando, lo que haya sobrevivido igual en los dos se extrae a un paquete común de verdad, ya probado por partida doble.

---

## 2. La regla de oro

> **Antes de escribir cualquier módulo, la pregunta obligatoria: ¿esto valdrá igual para el siguiente solitario?**
>
> - **Sí** → va en la **base común**, sin una sola referencia al juego concreto: ni a sus reglas, ni a sus posiciones, ni a sus textos.
> - **No** → va en el **código del juego**.
> - **"Casi"** → va en la base común **parametrizado**. Nunca duplicado, y nunca con un `if (napoleon)` dentro.

**Esto no se vigila a ojo: lo vigila `npm run test:architecture`**, que analiza los imports y pone el pipeline en rojo si alguien cruza la frontera. Una regla que solo está escrita se erosiona sola.

Y la dependencia va **siempre en un solo sentido**:

```
game/  ──usa──►  core/  ◄──usa──  platform/
   ▲                                  │
   └──────────  nunca al revés  ◄─────┘
```

`core/` y `platform/` **no saben que existe el Napoleón**. Si algún día uno de ellos necesita importar algo de `game/`, es que la pieza estaba mal cortada.

---

## 3. Inventario: qué se hereda y qué se escribe

| 🧱 Base común — se hereda | 🃏 Del juego concreto — se escribe |
|---|---|
| Capa de plataforma y adaptadores de portales | Reglas del juego (`rules.ts`) |
| Ranking con validación en servidor y respaldo local | Disposición del tablero |
| Almacenamiento de preferencias y partida | Sistema de puntuación |
| Motor de idiomas y detección automática | Textos de las reglas |
| Consentimiento y política de privacidad | Modos de dificultad |
| Anuncios y capa de recompensas | Arte, icono y nombre |
| Compras (quitar anuncios, cosméticos) | Ficha de tienda |
| Reto diario: semilla del día, calendario del mes y racha | |
| Solver que valida las semillas antes de publicarlas | |
| Estadísticas y rachas | |
| Analítica y eventos | |
| Motor de pistas *(parametrizado por reglas)* | |
| Infraestructura Supabase + Vercel | |
| Arnés de tests completo | |
| Empaquetado Capacitor y para portales | |

**La columna de la izquierda es mucho más larga que la de la derecha.** Ese es exactamente el motivo de todo esto: el segundo solitario debería ser *reglas nuevas + tablero nuevo* y poco más.

---

## 4. Estructura estándar de carpetas

Vale para cualquier solitario del catálogo. **En la raíz solo lo que las herramientas exigen que esté ahí.**

```
<proyecto>/
  README.md                  ← Documentación técnica del proyecto.
  RULES.md                   ← Reglamento consolidado del juego.
  index.html · package.json · tsconfig*.json · vite.config.ts · vercel.json

  src/
    platform/                ← DÓNDE corre el juego. Base común.
      types.ts               ← Interfaz Platform + capacidades.
      detect.ts              ← Detección en tiempo de ejecución.
      adapters/              ← web · crazygames · gamedistribution · y8 · capacitor
    core/                    ← QUÉ sabe hacer el juego por debajo. Base común.
      leaderboard/           ← types · remote · local · fachada con respaldo.
      storage/               ← Preferencias que no revientan sin localStorage.
      i18n/                  ← Motor de idiomas (los textos del juego van aparte).
      rewards/ daily/ analytics/ consent/ solver/
    game/                    ← EL JUEGO CONCRETO. Lo único que se reescribe entero.
      types · deck · state · rules · save · leaderboard (atadura)
    hooks/ components/ styles/

  api/                       ← Funciones serverless: ranking y keepalive.
  scripts/                   ← Tests, capturas, empaquetado.
  public/                    ← favicon, iconos, privacidad.html.

  docs/
    esquemas/                ← Reglamento gráfico original.   versionado
    tecnica/                 ← Este documento y similares.    versionado
    vivos/                   ← Planes de trabajo en curso.    fuera del repo
    informes/                ← Investigación y estrategia.    fuera del repo
    notas/                   ← Notas de trabajo del autor.    fuera del repo
```

### Convención de nombres de archivo

**Minúsculas, sin acentos y sin espacios; separador `_`.** Los acentos y los espacios en rutas dan guerra en scripts, en URLs y en herramientas de línea de comandos, y obligan a comillas por todas partes. Excepciones aceptadas: `README.md` y `RULES.md`, que son convención universal de repositorio.

### Regla al mover cualquier archivo

**Mover obliga a actualizar todas sus referencias, en la misma pasada**: enlaces entre documentos, enlaces de los documentos al código, rutas dentro de scripts, `README.md` y patrones del `.gitignore`. La mudanza no está terminada hasta que no queda un enlace roto y las pruebas están en verde.

> Truco que ahorra disgustos: ignorar la documentación **por carpeta** (`docs/vivos/`) y no por nombre de archivo. Así renombrar un documento no lo mete de golpe en el repositorio sin querer.

---

## 5. Las piezas comunes, una a una

Estado a 16/08/2026: ✅ existe y está probado en el Napoleón · ⏳ diseñado pero aún no escrito.

### ✅ `core/leaderboard/` — ranking a prueba de fallos

Cuatro archivos: `types.ts` (el contrato), `remote.ts` (servidor HTTP), `local.ts` (`localStorage`) y `index.ts` (la fachada).

**Lo importante: la fachada nunca lanza una excepción.** Si el servidor no responde, cae al ranking local y el jugador no ve nunca un mensaje técnico. En un portal, donde `/api/...` sencillamente no existe, esto es la diferencia entre un juego que funciona y uno que enseña "Failed to fetch" en pantalla.

El juego concreto aporta **su atadura** (`game/leaderboard.ts`): sus tipos y de dónde salen los datos. La fachada no sabe qué es una puntuación de Napoleón.

**Una tabla por dificultad, desde el primer día.** Si el juego tiene modos que puntúan distinto, mezclarlos en una tabla premia al modo fácil y compara lo incomparable. Cuatro cosas que aprendimos partiéndolas tarde:

- **La separación tiene que llegar hasta la consulta.** Filtrar el top 10 ya recortado deja la tabla difícil **vacía** en cuanto los diez primeros puestos se llenan de partidas fáciles — que es justo lo que va a pasar. Atraviesa las cuatro capas: interfaz, fachada, API y `SELECT`.
- **`qualifies` se parte también.** Comparar una puntuación del modo difícil contra el top del fácil hace que casi nunca clasifique. Es el mismo error escondido en otro sitio y **es silencioso**: no rompe nada visible, solo deja de ofrecer el ranking a quien se lo ha ganado.
- **El servidor comprueba las dos mitades** de la tabla declarada contra su propia simulación. Sin eso, cualquiera manda una partida del modo fácil a la tabla difícil y la encabeza.
- **Cómo hacerlo sin migrar la base de datos:** un identificador compuesto (`"won-2"`, `"lost-4"`) que viaja por el cable y que el servidor descompone. En la base, dificultad y desenlace siguen siendo **dos columnas distintas**, así que cada fila que ya existía cae sola en la tabla que le toca. Para la base común es gratis: la categoría siempre fue una cadena opaca.

Y si las claves de almacenamiento cambian, **hay que repartir el ranking local que ya existía**. En un portal el ranking local es el único que hay: perderlo es perder todo lo que el jugador tenía.

**La tabla dice de dónde salen sus datos.** La fachada expone `getScope()` → `"global" | "local"`; cuando es local se rotula *"Solo en este dispositivo"* con una línea que lo explica, y cuando es global no se rotula nada. Una tabla titulada "Liga de Campeones" llena de nombres que son todos tuyos, sin explicar por qué, es engañosa. **Ojo:** en el Napoleón esa función existía desde el primer día y no la usaba nadie — escribirla no sirve de nada si nadie la llama.

### ✅ `core/storage/prefs.ts` — almacenamiento que no revienta

Acceder a `localStorage` **puede lanzar** (modo privado estricto, permisos denegados). Todo acceso va envuelto. Consecuencia conocida y aceptada: en modo privado el juego no puede saber si es tu primera visita, así que no enseña las reglas de entrada. Se juega igual.

### ✅ `platform/` — la capa de adaptadores

Una interfaz, un adaptador por destino, detección al arrancar. El juego pregunta por **capacidades** ("¿hay anuncio recompensado?"), nunca por identidad ("¿estoy en CrazyGames?"). Así, añadir un portal es escribir un archivo y no revisar la interfaz entera.

Hoy hay dos adaptadores: `web` (backend propio, ranking global) y `portal` (dominio ajeno, sin backend, ranking local). Los identificadores de los tres portales concretos apuntan de momento al genérico; se separarán cuando haya un SDK real que integrar.

**Quién conecta las dos mitades:** la capa de aplicación (`main.tsx`), que es el único archivo que conoce los dos lados. El juego no importa nada de `platform/`; recibe su configuración al arrancar:

```ts
const platform = getPlatform();
configureLeaderboard({ remoteBaseUrl: platform.leaderboard.remoteBaseUrl });
void platform.init();
```

```ts
interface Platform {
  readonly id: "web" | "crazygames" | "gamedistribution" | "y8" | "capacitor";
  init(): Promise<void>;
  gameplayStart(): void;             // los portales lo exigen para medir y colocar anuncios
  gameplayStop(): void;
  ads: { interstitial(): Promise<void>; rewarded(): Promise<"granted" | "dismissed" | "unavailable"> };
  leaderboard: { list(cat): Promise<Entry[]>; submit(payload): Promise<Entry[]> };
  storage: { get(key): Promise<string | null>; set(key, value): Promise<void> };
  analytics: { track(event, props?): void };
  capabilities: {
    rewardedAds: boolean; interstitialAds: boolean;
    externalApi: boolean;              // ¿podemos llamar a nuestro backend?
    purchases: boolean; globalLeaderboard: boolean;
  };
}
```

### ✅ `i18n/` — idiomas

Motor + diccionario. **El inglés es el idioma por defecto para todo lo que no sea el idioma nativo del autor**: los portales sirven público mundial, y mandar a un japonés a la versión española es perderlo. La preferencia elegida por el jugador manda siempre sobre la detección automática.

**Los textos de la base común van en su propio diccionario**, separados de los textos del juego. Si no, el siguiente solitario hereda las reglas del anterior.

### ✅ `core/daily/` — el reto diario

Semilla por fecha, racha y resultado del día. No sabe nada de las reglas de ningún solitario: el juego solo le pasa **su tabla de semillas** y sus variantes de dificultad.

Seis decisiones que conviene heredar tal cual:
- **La tabla de semillas es un archivo de datos**, editable a mano y subible a GitHub sin tocar código. Es además el contrato con el solver: cuando exista, escribe ahí sin que la interfaz cambie.
- **Si un día no está en la tabla, la semilla se deriva de la propia fecha** (FNV-1a). El reto nunca falta, aunque la tabla esté vacía.
- **La fecha es local, no UTC**: la racha es del jugador. Y el día anterior se calcula construyendo la fecha **a mediodía**, porque sumar y restar 24 horas se tuerce en los cambios de hora — una racha no puede romperse porque el país haya adelantado el reloj.
- **La racha cuenta participación, no victorias.** En un solitario difícil, una racha que solo cuente victorias es un cero permanente y deja de tirar del jugador.
- **Qué días se pueden jugar lo decide el motor, no la interfaz.** `playableKeys(hoy)` y `isPlayable(fecha, hoy)` devuelven del día 1 del mes a hoy, y de ahí saca su lista el calendario. Puesto en el motor, ninguna pantalla futura puede saltarse la regla por descuido, y una fecha que llegue de fuera —una URL manipulada, un dato viejo guardado— se rechaza sola.
- **Que exista la semilla no abre el día.** La tabla va semanas por delante del calendario, así que son dos cosas distintas y hay que probarlo explícitamente: tener la semilla del día 25 no puede abrir el día 25 cuando estamos a 16.
- **La racha se marca en el día de HOY, sea cual sea el reto jugado.** Mide que el jugador ha venido hoy, no qué reparto ha hecho. Marcarla en la fecha del reto es el error que fabrica rachas de treinta días a quien juega una tarde. Racha y colección son dos contadores distintos y tiran del jugador de dos maneras distintas: la racha le hace volver mañana, la colección le da algo que hacer hoy.
- **La colección se cuenta por DÍAS y su total es el mes entero.** El total son los días del mes —28, 29, 30 o 31— e **incluye los que aún no han llegado**, porque es una meta mensual: *"2 de 31"* el día 2 invita a algo, *"2 de 2"* no. Contar día × dificultad daba *"2 de 32"*, un número que no cabe en ningún mes.
- **Un contador por dificultad, no uno común.** `15/31 · 2 palos · 12/31 · 4 palos`. Cada uno sigue siendo sobre los días del mes —así ninguno puede enseñar un imposible— y hacer las dos dificultades del mismo día **suma en las dos**, que es lo que el jugador espera al ver dos marcas por día en el calendario. Un contador común obligaba a elegir entre premiar la segunda dificultad o enseñar un número coherente; separados no hay que elegir. **Medido**: en francés, el idioma más largo, ocupa 216 px de los 232 disponibles a 320 px — cabe en una línea, pero va en la suya, no junto a la racha.
- **El registro de acciones va en su propia clave**, no dentro de los resultados. Los resultados son diminutos y no pueden fallar; las partidas ocupan dos órdenes de magnitud más. Separados, un almacenamiento lleno se lleva la prueba y nunca el progreso visible. Y **la partida guardada es siempre la que produjo la puntuación guardada**: si un intento mejora la puntuación pero no trae las acciones, la prueba anterior se borra. Una prueba que acredita otra puntuación es peor que ninguna.
- **Guardarlo desde el primer día.** El servidor solo acredita lo que puede reproducir: si el registro de acciones no se guarda desde que existe el reto diario, la clasificación mensual nacerá sin poder acreditar nada de lo jugado antes. Cuesta una línea entonces y no tiene arreglo después.

### ✅ El solver (en `scripts/`, no en el bundle)

La pieza que sostiene la promesa del reto diario. Tres decisiones que hay que repetir en cada solitario:

1. **Buscar victorias, no demostrar imposibilidad.** Decidir que un reparto es imposible exige explorar el espacio entero; encontrar *una* partida ganada es incomparablemente más barato. Y como las semillas del reto **las elegimos nosotros**, con eso basta.
2. **Modelo rápido propio + verificación con el motor real.** El motor clona las 104 cartas en cada jugada (lo necesita para el deshacer) y una búsqueda hace cientos de miles. El modelo del solver usa enteros y cadenas. El riesgo de tener dos modelos se cubre reproduciendo la partida encontrada contra el motor de verdad: **si se desvía, se descarta**. Nunca al revés.
3. **Muchos intentos cortos, no pocos largos.** Medido: misma tasa de acierto con un 30 % menos de tiempo. El atasco típico no es "no hay solución", es haberse metido por el pasillo equivocado al principio, y para eso lo que sirve es reintentar con otro desempate.

Tasa de acierto en el Napoleón: **~60 % en 2 palos, ~10 % en 4 palos** (8 intentos × 150 000 nodos). Un 10 % basta y sobra para elegir 31 días, pero **no basta para un motor de pistas**: si algún día se quiere dar pistas en 4 palos, hará falta un solver mejor.

**Un día publicado es un día congelado.** El generador se niega por su cuenta a tocar el pasado: cambiarle la semilla a un día ya jugado le cambia el reparto a quien lo jugó y su resultado guardado deja de corresponder con nada. Con una excepción, y solo en el primer mes: los días **anteriores al estreno de la función** no se le sirvieron nunca a nadie, así que sí se pueden generar. Va detrás de una opción explícita (`--estreno=AAAA-MM-DD`) para que sea una decisión consciente y quede escrita en el historial, no un caso especial escondido en el código. **En cualquier mes normal no se usa.**

> Conviene estrenar el reto diario **el día 1 de un mes** y con la tabla ya generada. Estrenarlo a mitad de mes deja días huérfanos que hay que rescatar después.

### ⏳ `core/rewards/`, `core/analytics/`, `core/consent/`

Diseñados, no escritos. Reglas para cuando toque:
- **rewards**: interfaz "dame una recompensa" que en web es gratis y en la app llama al SDK de anuncios. El juego nunca habla con un SDK directamente.
- **analytics**: eventos neutros que cada adaptador envía a donde toque. **Nunca un tracker propio en un build de portal**: sería una petición a un tercero desde el dominio del portal.
- **consent**: obligatorio en la UE en cuanto haya publicidad.

---

## 6. Lo que se reescribe entero: `game/`

TypeScript puro: **sin React, sin DOM y sin efectos**. Determinista a partir de una semilla. Esta disciplina no es estética, es lo que permite gratis:

- **validar partidas en el servidor** re-simulándolas (anti-trampas),
- **reto diario** con la semilla del día,
- **solver y pistas**,
- **tests del motor** sin levantar un navegador.

Archivos: `types.ts` · `deck.ts` (barajado con PRNG sembrado) · `state.ts` · `rules.ts` · `save.ts` · `leaderboard.ts` (la atadura).

---

## 7. Infraestructura

| Pieza | Qué se hereda |
|---|---|
| **Vercel** | Despliegue del `dist/`. Ojo: despliega `dist`, **no** `dist-portal` |
| **Supabase** | Tabla del ranking + `api/leaderboard/{list,submit}`. **El índice tiene que cubrir el filtro entero**: si se consulta por desenlace *y* dificultad, el índice lleva las dos columnas y luego el orden (`category, suit_mode, score DESC, ts ASC`) |
| **Anti-trampas** | El servidor re-simula la partida con la semilla y el registro de acciones antes de aceptar una puntuación |
| **Keepalive** | `api/keepalive` + cron diario en `vercel.json`. Sin esto, el plan gratuito de Supabase **pausa el proyecto por inactividad** y el ranking deja de funcionar |
| **Imports ESM** | En las funciones serverless, los imports relativos **necesitan la extensión `.js`** o fallan solo en producción |

---

## 8. Builds por destino

| Destino | Cómo | Detalles que importan |
|---|---|---|
| Web propia | `npm run build` | Va a Vercel |
| Portal | `npm run build:portal` → `dist-portal/` | `--mode portal`, **sin sourcemap** (ahorra ~500 KB), `VITE_TARGET=portal` desactiva el ranking remoto |
| Paquete | `npm run pack:portal` | Comprueba límites (≤ 20 MB, ≤ 1500 archivos), que no haya sourcemaps, que `index.html` esté en la raíz del zip y que **no quede ningún marcador sin rellenar** |

**`base: "./"` en Vite es obligatorio**: los portales sirven el juego desde una subcarpeta y con rutas absolutas no carga nada.

### Convención de marcadores

Los datos que aún no existen se escriben como marcador literal **entre corchetes y en mayúsculas**: `[EMAIL@CONTACTO.COM]`. Se localizan de un vistazo y se rellenan todos de una pasada. **El empaquetado falla si detecta uno**, porque archivos como `privacidad.html` viajan dentro del zip que se sube al portal.

---

## 9. Arnés de tests

| Comando | Qué cubre |
|---|---|
| `npm run typecheck` | Tipos |
| `npm run test:architecture` | **La frontera de §2**: falla si `core/` o `platform/` importan del juego, si `game/` importa de `platform/` o de React, o si el juego lee el destino del build. Y **que la política de privacidad enumere todas las claves de almacenamiento** que usa el código, en los dos sentidos |
| `npm run test:smoke` | Motor de reglas, sin navegador |
| `npm run test:daily` | Reto diario: semillas deterministas, racha, colección y almacenamiento que revienta |
| `npm run test:solver` | Que el solver **no miente**: una partida truncada no se da por ganada, y cada semilla publicada se gana reproduciendo su partida contra el motor real |
| `npm run test:leaderboard` | Ranking con el servidor caído, tablas que no se mezclan y migración del ranking local |
| `npm run test:layout` | 12 viewports: sin scroll, sin recortes, con el peor caso forzado |
| `npm run test:functional` | Navegador real: flujo completo |
| `npm run test:portal` | Build de portal servido desde subcarpeta con `/api` caído |
| `npm run test:screenshots` | Capturas para las fichas de tienda |
| `npm test` | Todo lo anterior, en orden |

**Definición de "hecha"** para cualquier tarea: la funcionalidad está, **sus pruebas están en verde y documentadas**, y `npm test` sigue pasando entero.

**Cómo se documenta una prueba:** ID · qué prueba · cómo · esperado · resultado (con el motivo si falla, no solo "falló") · estado.

---

## 10. Trampas conocidas — leer antes de repetirlas

1. **Medir, no estimar.** Calcular el tamaño de carta restando una altura de cabecera *estimada* rompe el tablero en cuanto la cabecera real mide otra cosa (otro idioma, otra fuente, otra barra de navegador). Se mide el contenedor con un `ResizeObserver`.
2. **Forzar el peor caso en los tests.** Un marcador que cabe con `00:07` se sale con `888:88`. Si el test no fuerza el peor caso, no prueba nada.
3. **`overflow: hidden` sin `min-width`** hace que el texto se pinte encima del vecino en vez de recortarse. Abreviar no basta: hay que recortar además.
4. **Nada de promoción automática de cartas.** Subir cartas solas hace movimientos que el jugador no quería. Lo que se automatiza es la *comodidad* (un toque promueve), nunca la *decisión*.
5. **En Windows, `proc.kill()` mata el intérprete y deja vivo el proceso que escucha.** Los servidores de previsualización huérfanos se acumulan y tumban otro test con un `EADDRINUSE` que no tiene nada que ver. Puerto estricto y matar el árbol entero.
6. **`tsc -b` puede emitir un `vite.config.js` junto al `.ts`**, y Vite da prioridad al `.js`: cualquier cambio en la configuración se queda sin efecto, en silencio. Salida del subproyecto redirigida fuera de la raíz.
7. **Las reglas no se muestran en cada carga.** Solo la primera visita, y accesibles desde un botón. Dos pantallas antes de jugar, todas las veces, es la fuga de retención más barata de tapar.
8. **No escribas en un test un hecho que va a caducar.** Una comprobación decía "la tabla de semillas está vacía" —cierto el día que se escribió— y se puso en rojo sola en cuanto el solver la rellenó. Un test debe afirmar la **regla** (las semillas publicadas son válidas, un día sin entrada deriva la suya), nunca el estado del momento.
9. **Un almacenamiento inyectable puede reventar.** El del navegador ya absorbe sus errores, pero en cuanto se permite inyectar otro hay que asumir lo peor y envolverlo: quedarse sin racha es un incordio, que el juego no arranque es perderlo. Este fallo lo cazó el test del reto diario antes de llegar a producción.
10. **Una regla de seguridad protege a alguien concreto: comprueba que ese alguien existe antes de aplicarla.** "Un día publicado es un día congelado" protege a quien ya jugó ese día. Di por intocables los 16 primeros días de agosto sin caer en que el reto diario **se había estrenado ese mismo día 16**: los 15 anteriores no los vio nadie y no había nada que proteger. Estuve a punto de dejar medio mes sin garantía por respetar una regla en el vacío. Antes de dar algo por irreversible, mira **desde cuándo existe la función** — el historial de git lo dice en un comando.
11. **Un diálogo tiene que caber en apaisado, y no cabe.** En horizontal la ventana puede tener 340 px de alto: cualquier panel se sale y sus botones de abajo quedan fuera de la pantalla, sin forma de llegar a ellos porque `body` lleva `overflow: hidden`. Se arregla haciendo que **desplace el overlay, no el panel**, y centrando el panel con `margin: auto` — `align-items: center` a secas recorta por ARRIBA cuando el contenido no cabe y deja el título inalcanzable. En el Napoleón esto llevaba roto desde antes de que nadie lo mirara: **el test de layout mide el tablero, no los diálogos.**
12. **Un script de capturas que cierra todos los diálogos no puede fotografiar lo que vive en un diálogo.** El reto diario, el calendario y el ranking no salían en ninguna imagen de la ficha de tienda — la función más vendible del juego, invisible. Y hay que **sembrar datos de muestra**: un calendario en blanco y una tabla vacía no enseñan nada. Que quede escrito en la ficha que esas capturas llevan progreso inventado.
13. **Una promesa que no vigila un test se convierte en mentira sola.** La política de privacidad enumera cada cosa que se guarda, y esa lista **se quedó corta dos veces sin que nadie se enterara**: al añadir el guardado de la partida y al añadir el reto diario. Nadie mintió; el código avanzó y el documento no. Se arregla con un test que saca las claves de almacenamiento del código y exige que cada una esté nombrada — **y que mire los sufijos, no solo la raíz**: si solo comprueba `solnap.daily`, borrar la línea de `solnap.daily.replays` sigue pasando porque las hermanas cubren la raíz. Regla general: **si el argumento de venta es que algo es comprobable, que lo compruebe el pipeline.**
14. **El estado interactivo va en el botón BASE, no en cada sitio que lo usa — y aun así hay que recorrerlos todos.** El resalte al pasar el puntero se fue añadiendo suelto —a las tarjetas, a los botones del reto, al calendario— y `.hud__btn` se quedó sin él. Resultado: **el mismo fallo reapareció en cada pantalla nueva** y el propietario tuvo que reportarlo tres veces. Si un estilo describe *cómo se comporta un control*, pertenece a la clase del control. Pero la clase base **solo protege a quien la lleva puesta**: al recorrer después TODOS los botones de TODOS los diálogos aparecieron tres huecos que la regla base no cubría —un botón con pinta de enlace que no llevaba la clase, y dos estados "activo × fondo" en los que el resalte coincidía exactamente con el color que el botón ya tenía—. De ahí tres casos que siempre necesitan su propia versión: **el control ya pintado con el color de acento** (se aclara, no se repite), **los que viven sobre fondo claro** (donde el acento desaparece y hay que usar el color oscuro de la marca) y **cada combinación de activo × fondo**, que se multiplican y no las cubre ninguna regla general.
15. **Un contador puede enseñar un número imposible sin que nada falle.** *"2/32 retos"* en un mes de 31 días: la aritmética era correcta —16 días × 2 dificultades— pero el número no significaba lo que el jugador leía. Los tests comprobaban que la cuenta cuadrara consigo misma, no que **cupiera en la realidad**. Cuando un valor tiene un techo natural (días de un mes, cartas de una baraja, palos), hay que probar ese techo explícitamente.
16. **Todo diálogo necesita una salida, y la salida es UNA sola decisión.** El selector de dificultad se abre desde tres sitios; el botón de salir miraba `origen === "hud"` y la tecla `Escape` **miraba lo mismo, escrito aparte**. Dos copias de una condición no se equivocan por separado: se quedan cortas juntas, y el diálogo del fin de partida se quedó sin las dos salidas a la vez. Nadie lo notó mientras el diálogo solo servía para elegir dificultad —"Jugar otra" y ya—, pero en cuanto le metimos dentro el calendario del reto pasó a ser una pantalla que se entra a **mirar**, y el que entraba a mirar se quedaba encerrado. Dos reglas: **una sola constante gobierna botón y teclado**, y **cada vez que un diálogo gana contenido, revisa si sigue habiendo forma de salir sin actuar**. Al aplicarlo a los siete diálogos apareció el caso grave: **el que pedía el nombre para el ranking tampoco tenía salida**, y ahí no era una incomodidad sino una promesa rota — participar se había aprobado *como voluntario* y la única forma de no dar un nombre era recargar la página. Norma para el molde: **un diálogo que pide un dato tiene que poder cerrarse sin darlo**, y un test debe comprobar que al cerrarlo no se ha guardado ni enviado nada.
17. **La privacidad se promete referida al juego, nunca a la página.** En un portal, los anuncios y las cookies de alrededor son suyos. *"Este juego no recopila tus datos"* — jamás *"esta página no te rastrea"*.

---

## 11. Checklist para arrancar un solitario nuevo

**Fase A — Esqueleto**
1. Copiar la estructura de carpetas de §4 y la configuración (Vite con `base: "./"`, tsconfigs, scripts de `package.json`).
2. Traer `core/` y `platform/` **sin tocar**. Si hay que tocar algo para que encaje, ese algo estaba mal cortado: se parametriza, no se duplica.
3. Traer el arnés de tests completo.

**Fase B — El juego**
4. Escribir `game/` entero: reglas, reparto, puntuación. TypeScript puro y determinista por semilla.
5. `test:smoke` con las reglas nuevas antes de dibujar nada.
6. Tablero y componentes. Layout que se mide, no que se estima.
7. `RULES.md` y textos de idiomas (nativo + inglés).

**Fase C — Alrededor**
8. Atadura del ranking + tabla en Supabase + `api/`, con el cron de keepalive.
9. Privacidad: `public/privacidad.html`, distintivo visible y auditoría de que no hay ni un rastreador.
10. Iconos, favicon y ficha de tienda.

**Fase D — Salida**
11. `npm test` entero en verde.
12. `build:portal` + `pack:portal` (que valida límites y marcadores).
13. Prueba manual en móvil real, en vertical y en apaisado. **Aquí es donde aparecen los fallos que ningún test automático ve.**

---

## 12. Lo que NO se copia del juego anterior

Reglas, posiciones del tablero, puntuación, textos del reglamento, modos de dificultad, arte, nombre e icono. Si al arrancar el juego nº 3 aparece la tentación de copiar uno de estos, es señal de que la pieza debería estar parametrizada en la base común — y entonces se sube ahí, no se copia.
