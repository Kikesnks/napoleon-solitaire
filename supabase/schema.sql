-- Esquema del leaderboard global de Solitario Napoleón.
--
-- Ejecuta este script en el SQL Editor del proyecto Supabase
-- (https://supabase.com → tu proyecto → SQL Editor → New query).
--
-- La inserción se hace SIEMPRE desde el backend (Vercel Functions) usando la
-- service_role key (que salta RLS). La lectura puede hacerse con la anon key
-- desde el navegador o también desde el backend; las policies permiten lectura
-- pública.

CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGSERIAL PRIMARY KEY,
  -- Qué solitario escribió la fila. La tabla la comparten varios juegos y esta
  -- columna es lo único que separa sus puntuaciones. La pone el backend de cada
  -- juego como constante ('napoleon' en este); nunca llega desde el cliente.
  game TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('won', 'lost')),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 30),
  score INTEGER NOT NULL CHECK (score >= 0),
  -- 0 = juego sin modos (otros solitarios de la misma tabla). Napoleón solo
  -- guarda 2 o 4: su backend rechaza cualquier otro valor antes de insertar.
  suit_mode SMALLINT NOT NULL CHECK (suit_mode = ANY (ARRAY[0, 2, 4])),
  date TEXT NOT NULL,
  ts BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice principal: top N de cada tabla, ordenado por score DESC y ts ASC
-- (empate: gana la entrada más antigua).
--
-- Son CUATRO tablas —ganadas y perdidas, por cada dificultad— y por eso el
-- índice lleva `suit_mode`: con 2 palos se puntúa bastante más alto que con 4,
-- así que mezclarlas premiaba la dificultad baja. No hizo falta crear ninguna
-- tabla nueva para separarlas, porque `category` y `suit_mode` ya eran dos
-- columnas distintas: cada fila que ya existía cae sola en la tabla que le toca.
--
-- `game` va delante porque todas las consultas filtran primero por juego.
CREATE INDEX IF NOT EXISTS idx_leaderboard_game
  ON leaderboard (game, category, suit_mode, score DESC, ts ASC);

-- Los índices anteriores, sin `game`, ya no encabezan ninguna consulta: todas
-- filtran por juego. Se pueden borrar sin miedo, y si esto se ejecuta en una
-- base recién creada simplemente no existen.
DROP INDEX IF EXISTS leaderboard_board_idx;
DROP INDEX IF EXISTS leaderboard_top_idx;

-- RLS: lectura pública, escritura sólo con service_role (backend).
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leaderboard_select_public ON leaderboard;
CREATE POLICY leaderboard_select_public
  ON leaderboard FOR SELECT
  USING (true);

-- No creamos policy de INSERT: sólo la service_role (que salta RLS) puede
-- insertar. Esto fuerza que toda escritura pase por la validación del backend.
