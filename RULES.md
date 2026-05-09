# Reglas del Solitario Napoleón

Versión consolidada que combina las reglas originales del PDF
(`Esquema_solitario_Napoleon.pdf`) con las **adiciones** acordadas durante el
desarrollo (marcadas como **NUEVO**).

## Objetivo

Ordenar las 104 cartas de las dos barajas en 8 secuencias completas. Cada
secuencia ocupa, mientras se construye, la posición I, II, III, IV o X y se
retira del tablero al completarse, dejando la posición libre para empezar
otra.

## Material

- 2 barajas francesas (52 cartas cada una, 104 en total).

## Posiciones del tablero

| ID            | Función                                                                 |
|---------------|-------------------------------------------------------------------------|
| `I, II, III, IV` | Fundaciones **descendentes**: K → Q → J → ... → 2 → A, mismo palo y color. Al colocar el A toda la pila se retira. |
| `X`             | Fundación **ascendente**: A → 2 → 3 → ... → Q → K, mismo palo y color. Al colocar el K se retira. |
| `A, B, C, D`    | Pilas iniciales boca abajo con la carta superior boca arriba.            |
| `A1, B1, C1, D1`| Free cells: cartas auxiliares boca arriba.                              |
| `1, 2, 3, 4`    | Pilas de reparto, donde se vuelcan las cartas del montón.               |
| Montón (`M`)    | Cartas que quedan boca abajo tras el reparto inicial.                   |

## Disposición inicial

1. Se baraja y se hacen **4 pilas de 10 cartas boca abajo** (A, B, C, D).
2. Se saca la carta superior de cada pila y se coloca boca arriba en
   `A1`, `B1`, `C1`, `D1` respectivamente.
3. La nueva carta superior de cada pila A/B/C/D se voltea boca arriba.
4. Resultado: A/B/C/D tienen 9 cartas (8 boca abajo + 1 boca arriba),
   A1/B1/C1/D1 tienen 1 carta boca arriba, el resto (64 cartas) forma el
   montón boca abajo.

## Movimientos permitidos

### Orígenes
Cualquier carta boca arriba que sea la carta superior de su pila en:
- Pilas A/B/C/D (la única boca arriba).
- Free cells A1/B1/C1/D1.
- Pila ascendente X.
- Pilas de reparto 1/2/3/4 (la última que se haya volcado).

### Destinos
- **I, II, III, IV** (descendentes): la carta debe ser un K si la pila está
  vacía, o del mismo palo y rango = top − 1 si la pila tiene cartas.
- **X** (ascendente): la carta debe ser un A si la pila está vacía, o del
  mismo palo y rango = top + 1 si la pila tiene cartas.
- **A1, B1, C1, D1** (free cells): ver siguiente sección.

### **NUEVO** — Free cells A1/B1/C1/D1
- Si están **vacías**, aceptan **cualquier carta** boca arriba.
- Si **contienen cartas**, aceptan otra **del mismo palo y color en orden
  ascendente** (rango = top + 1). En la práctica, se pueden construir
  pequeñas secuencias ascendentes como buffer para luego encadenarlas a una
  fundación descendente cuando interese.

### Reposición de free cells
Cuando una free cell A1/B1/C1/D1 se queda **vacía** (todas sus cartas se
han movido):
1. La carta superior boca arriba de la pila A/B/C/D correspondiente se mueve
   a la posición vacía.
2. La siguiente carta de A/B/C/D, que estaba boca abajo, se voltea boca arriba.

### Encadenado a fundación
Cuando se mueve la carta superior de **A1/B1/C1/D1/X** a una fundación, todas
las cartas que ya estaban en el origen y que siguen encajando en el orden
de la fundación se promueven en cadena en el mismo movimiento. La cadena se
limita a las cartas que estaban en el origen ANTES del primer movimiento;
una reposición desde A/B/C/D no extiende la cadena.

### **NUEVO** — Visualización de B, B1, D, D1
Estas posiciones se pintan en **orientación horizontal** (cartas tumbadas
sobre su lado largo), tal y como muestra el esquema del PDF original. Al
arrastrar una carta de estas posiciones, el overlay flotante vuelve a
orientación natural (portrait) para que el usuario vea claramente el rango
y el palo mientras mueve.

## Reparto del montón por rondas

| Ronda | Cartas por reparto | Pilas activas | Notas                            |
|-------|-------------------|---------------|----------------------------------|
| 1     | 4                 | 1, 2, 3, 4    |                                  |
| 2     | 3                 | 1, 2, 3       |                                  |
| 3     | 2                 | 1, 2          |                                  |
| 4     | 1                 | 1             | Última ronda — sin más repartos  |

En cada reparto se ponen N cartas boca arriba sobre las pilas activas
(una por pila). El jugador hace los movimientos que quiera y, cuando lo
decida, vuelve a "pinchar" el montón para repartir otras N cartas, que se
colocan **encima** de las anteriores. Sólo la última carta de cada pila
está disponible para mover.

Cuando el montón se agota:
1. Se juntan las pilas activas: pila1 sobre pila2 (poniendo las cartas de 1
   encima de las de 2), el resultado sobre la pila3, sobre la pila4. La pila
   resultante se voltea boca abajo en bloque (**NO se baraja**) y se
   convierte en el nuevo montón para la siguiente ronda.

## Final de partida

- **Victoria**: todas las cartas se han ordenado y retirado, el tablero queda
  vacío.
- **Derrota**: en la ronda 4, una vez agotado el montón, ya no hay más
  repartos. Si el jugador no logra completar las 8 fundaciones con los
  movimientos restantes, la partida se da por perdida (en la implementación
  web, "pinchar" un montón vacío en ronda 4 cierra la partida).

## Puntuación (implementación)

| Acción                              | Puntos |
|-------------------------------------|--------|
| Carta colocada en una fundación     | +10    |
| Completar una fundación (A en I-IV o K en X) | +50 |
| Mover entre free cells              | -1     |
