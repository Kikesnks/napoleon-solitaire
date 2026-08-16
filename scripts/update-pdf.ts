// Genera una versión actualizada de docs/esquemas/esquema_solitario_napoleon.pdf
// añadiendo un anexo con las reglas nuevas (visualización horizontal de B/B1/D/D1
// y stacking ascendente en las free cells). El PDF original se preserva como
// docs/esquemas/esquema_solitario_napoleon.original.pdf.
//
// Uso: npx tsx scripts/update-pdf.ts

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ESQUEMAS = path.join(ROOT, "docs", "esquemas");
const ORIGINAL = path.join(ESQUEMAS, "esquema_solitario_napoleon.pdf");
const BACKUP = path.join(ESQUEMAS, "esquema_solitario_napoleon.original.pdf");

async function main(): Promise<void> {
  const exists = await fs.stat(ORIGINAL).catch(() => null);
  if (!exists) {
    console.error(`No encuentro ${ORIGINAL}`);
    process.exit(1);
  }

  // Backup del original solo la primera vez.
  const backupExists = await fs.stat(BACKUP).catch(() => null);
  if (!backupExists) {
    await fs.copyFile(ORIGINAL, BACKUP);
    console.log(`Backup creado: ${path.basename(BACKUP)}`);
  } else {
    console.log(`Backup ya presente; uso el .original.pdf como fuente`);
  }

  const sourceBytes = await fs.readFile(BACKUP);
  const source = await PDFDocument.load(sourceBytes);
  const out = await PDFDocument.create();

  // Copia íntegra del original.
  const copiedPages = await out.copyPages(source, source.getPageIndices());
  for (const p of copiedPages) out.addPage(p);

  // Anexo
  const helv = await out.embedFont(StandardFonts.Helvetica);
  const helvBold = await out.embedFont(StandardFonts.HelveticaBold);

  // Tamaño de página similar al original (A4 horizontal en muchos slides; pero
  // por seguridad uso A4 estándar 595×842).
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = out.addPage([pageWidth, pageHeight]);

  const margin = 50;
  let y = pageHeight - margin;

  const drawTitle = (text: string): void => {
    page.drawText(text, {
      x: margin,
      y,
      size: 18,
      font: helvBold,
      color: rgb(0.05, 0.24, 0.12)
    });
    y -= 26;
  };

  const drawHeading = (text: string): void => {
    y -= 8;
    page.drawText(text, {
      x: margin,
      y,
      size: 13,
      font: helvBold,
      color: rgb(0, 0, 0)
    });
    y -= 18;
  };

  const drawParagraph = (text: string): void => {
    const maxWidth = pageWidth - margin * 2;
    const size = 11;
    const lineHeight = 15;
    const words = text.split(/\s+/);
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = helv.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && line) {
        page.drawText(line, { x: margin, y, size, font: helv, color: rgb(0, 0, 0) });
        y -= lineHeight;
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size, font: helv, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
    y -= 4; // separación tras párrafo
  };

  const drawBullet = (text: string): void => {
    const indent = 18;
    const maxWidth = pageWidth - margin * 2 - indent;
    const size = 11;
    const lineHeight = 15;
    page.drawText("•", { x: margin, y, size, font: helvBold, color: rgb(0, 0, 0) });
    const words = text.split(/\s+/);
    let line = "";
    let firstLine = true;
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = helv.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && line) {
        page.drawText(line, {
          x: margin + indent,
          y,
          size,
          font: helv,
          color: rgb(0, 0, 0)
        });
        y -= lineHeight;
        line = w;
        firstLine = false;
      } else {
        line = candidate;
      }
    }
    if (line) {
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font: helv,
        color: rgb(0, 0, 0)
      });
      y -= lineHeight;
    }
    void firstLine;
    y -= 2;
  };

  // ---------- Contenido del anexo ----------
  drawTitle("ANEXO — Reglas adicionales");
  drawParagraph(
    "Este anexo amplía el reglamento original con dos puntos consensuados " +
      "durante la implementación: la forma de pintar las posiciones B, B1, D, D1 " +
      "y el comportamiento de las posiciones A1, B1, C1, D1 como buffers ascendentes."
  );

  drawHeading("1. Visualización horizontal de B, B1, D, D1");
  drawParagraph(
    "Las cartas que ocupen las posiciones B, B1, D y D1 se dibujan en " +
      "orientación HORIZONTAL (tumbadas sobre su lado largo), tal y como muestra " +
      "el esquema del PRIMER PASO y de POSICION DE TODAS LAS CARTAS. El resto de " +
      "posiciones (I, II, III, IV, X, A, A1, C, C1 y las pilas de reparto 1-4) se " +
      "siguen pintando en orientacion vertical (portrait)."
  );
  drawParagraph(
    "En la implementacion web, al arrastrar una carta procedente de una posicion " +
      "horizontal el overlay flotante se muestra en orientacion natural (portrait) " +
      "para facilitar la lectura de rango y palo durante el movimiento."
  );

  drawHeading("2. Las free cells A1, B1, C1, D1 admiten apilamiento ascendente");
  drawParagraph(
    "Las posiciones A1, B1, C1 y D1, ademas de aceptar cualquier carta cuando " +
      "estan vacias, ahora ADMITEN cartas encima en ORDEN ASCENDENTE del MISMO " +
      "PALO Y COLOR (rango = top + 1). De este modo se pueden construir pequenas " +
      "secuencias ascendentes que despues se promueven en cadena a una fundacion " +
      "descendente I/II/III/IV cuando interese."
  );
  drawParagraph("Ejemplos:");
  drawBullet(
    "A1 contiene 5 de corazones. Encima se acepta el 6 de corazones, luego el 7, " +
      "luego el 8... siempre del mismo palo y color y en orden estrictamente ascendente."
  );
  drawBullet(
    "A1 contiene 5 de corazones. NO se acepta el 6 de picas (palo distinto) ni el " +
      "7 de corazones (salta un rango) ni el 4 de corazones (descendente)."
  );
  drawBullet(
    "Cuando A1 se vacia por completo, la pila A correspondiente repone la free cell " +
      "(sube su carta superior boca arriba) y voltea la siguiente carta tapada, exactamente " +
      "como en el reglamento original."
  );

  drawHeading("3. Encadenado a fundacion (compatible con la regla original)");
  drawParagraph(
    "Cuando una carta se mueve desde A1, B1, C1, D1 o X a una fundacion (I, II, III, " +
      "IV o X), todas las cartas del origen que sigan encajando en la secuencia de la " +
      "fundacion se promueven en el mismo movimiento. La cadena se limita a las cartas " +
      "que estaban en el origen ANTES del primer movimiento; la reposicion automatica " +
      "desde A/B/C/D no extiende la cadena."
  );

  drawHeading("4. Resumen de tamanos de pila al inicio de la partida");
  drawBullet("A, B, C, D: 9 cartas cada una (8 boca abajo + 1 boca arriba).");
  drawBullet("A1, B1, C1, D1: 1 carta boca arriba (sacada de la cima de la pila correspondiente).");
  drawBullet("Monton: 64 cartas boca abajo. Total dispuesto + monton = 104 cartas.");

  // Pie
  page.drawText("Anexo generado automaticamente — ver RULES.md y README.md.", {
    x: margin,
    y: 40,
    size: 9,
    font: helv,
    color: rgb(0.4, 0.4, 0.4)
  });

  const outBytes = await out.save();
  await fs.writeFile(ORIGINAL, outBytes);
  console.log(
    `Escrito ${path.basename(ORIGINAL)} (${(outBytes.length / 1024).toFixed(1)} KB) con ${out.getPageCount()} paginas.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
