// Lee el JSONL local de la sesión de Claude Code para esta carpeta y
// agrega tokens + duración por "turno humano" (cada vez que el usuario
// envió un prompt real, no comandos locales ni system-reminders).
//
// Uso:
//   npx tsx scripts/stats.ts
//
// El log vive en
//   %USERPROFILE%/.claude/projects/<proyecto>/<sessionId>.jsonl

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const SESSION_ID = "3cb01481-59fc-480b-80c6-80e12fe707f3";
const LOG = path.join(
  os.homedir(),
  ".claude",
  "projects",
  "C--KIKE-Claude-Solitario-Napoleon",
  `${SESSION_ID}.jsonl`
);

interface UsageBlock {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface AssistantMessage {
  role: "assistant";
  model?: string;
  content?: unknown;
  usage?: UsageBlock;
}

interface UserMessage {
  role: "user";
  content?: unknown;
}

interface LogEntry {
  type?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  timestamp?: string;
  message?: AssistantMessage | UserMessage | Record<string, unknown>;
}

interface Turn {
  index: number;
  prompt: string;
  startedAt: Date;
  endedAt: Date;
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
  assistantSteps: number;
}

function isLikelyHumanPrompt(content: unknown): { ok: boolean; text: string } {
  // Contenido de tool_result (array) → mensaje generado por el harness, no humano.
  if (Array.isArray(content)) return { ok: false, text: "" };
  if (typeof content !== "string") return { ok: false, text: "" };

  const text = content.trim();
  // Markers de mensajes generados por el sistema o por comandos locales.
  if (!text) return { ok: false, text };
  if (text.startsWith("<local-command-caveat>")) return { ok: false, text };
  if (text.startsWith("<local-command-stdout>")) return { ok: false, text };
  if (text.startsWith("<command-message>")) return { ok: false, text };
  if (text.startsWith("<command-stdout>")) return { ok: false, text };
  if (text.startsWith("<system-reminder>")) return { ok: false, text };
  if (text.startsWith("<bash-stderr>")) return { ok: false, text };
  if (text.startsWith("<bash-stdout>")) return { ok: false, text };
  if (text.startsWith("<user-prompt-submit-hook>")) return { ok: false, text };
  // Salida típica de comandos /slash: contiene <command-name> y/o <local-command-*>.
  if (text.includes("<command-name>")) return { ok: false, text };
  if (text.includes("<local-command-stdout>")) return { ok: false, text };
  return { ok: true, text };
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  if (hh > 0) return `${hh}h ${mm.toString().padStart(2, "0")}m ${ss.toString().padStart(2, "0")}s`;
  return `${mm}m ${ss.toString().padStart(2, "0")}s`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function truncate(s: string, n: number): string {
  s = s.replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

async function main(): Promise<void> {
  const raw = await fs.readFile(LOG, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const turns: Turn[] = [];
  let current: Turn | null = null;

  for (const line of lines) {
    let entry: LogEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Solo línea principal de conversación (tipo user/assistant).
    if (entry.type !== "user" && entry.type !== "assistant") continue;
    if (entry.isSidechain) continue; // sub-agentes: no cuentan como petición humana
    if (entry.isMeta) continue;
    const msg = entry.message;
    if (!msg) continue;
    const ts = entry.timestamp ? new Date(entry.timestamp) : null;
    if (!ts) continue;

    if (entry.type === "user") {
      const userMsg = msg as UserMessage;
      const detected = isLikelyHumanPrompt(userMsg.content);
      if (!detected.ok) continue;

      // Nuevo turno humano.
      current = {
        index: turns.length + 1,
        prompt: detected.text,
        startedAt: ts,
        endedAt: ts,
        input: 0,
        output: 0,
        cacheCreation: 0,
        cacheRead: 0,
        assistantSteps: 0
      };
      turns.push(current);
    } else if (entry.type === "assistant" && current) {
      const a = msg as AssistantMessage;
      const u = a.usage ?? {};
      current.input += u.input_tokens ?? 0;
      current.output += u.output_tokens ?? 0;
      current.cacheCreation += u.cache_creation_input_tokens ?? 0;
      current.cacheRead += u.cache_read_input_tokens ?? 0;
      current.assistantSteps += 1;
      current.endedAt = ts;
    }
  }

  if (turns.length === 0) {
    console.log("Sin turnos detectados.");
    return;
  }

  // ---------- Tabla por petición ----------
  console.log("");
  console.log("TOKENS Y DURACIÓN POR PETICIÓN HUMANA");
  console.log("=".repeat(110));
  const header = `${"#".padStart(3)}  ${"Duración".padEnd(13)}  ${"Steps".padStart(5)}  ${"Input".padStart(8)}  ${"Cache".padStart(9)}  ${"Output".padStart(8)}  ${"Total".padStart(9)}  Petición`;
  console.log(header);
  console.log("-".repeat(110));

  let totalDurationMs = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  let totalSteps = 0;

  for (const t of turns) {
    const durationMs = t.endedAt.getTime() - t.startedAt.getTime();
    const total = t.input + t.output + t.cacheCreation + t.cacheRead;
    totalDurationMs += durationMs;
    totalInput += t.input;
    totalOutput += t.output;
    totalCacheCreation += t.cacheCreation;
    totalCacheRead += t.cacheRead;
    totalSteps += t.assistantSteps;
    console.log(
      [
        t.index.toString().padStart(3),
        fmtDuration(durationMs).padEnd(13),
        t.assistantSteps.toString().padStart(5),
        fmtTokens(t.input).padStart(8),
        fmtTokens(t.cacheCreation + t.cacheRead).padStart(9),
        fmtTokens(t.output).padStart(8),
        fmtTokens(total).padStart(9),
        truncate(t.prompt, 50)
      ].join("  ")
    );
  }

  console.log("-".repeat(110));
  const grandTotal = totalInput + totalOutput + totalCacheCreation + totalCacheRead;
  console.log(
    [
      "TOT",
      fmtDuration(totalDurationMs).padEnd(13),
      totalSteps.toString().padStart(5),
      fmtTokens(totalInput).padStart(8),
      fmtTokens(totalCacheCreation + totalCacheRead).padStart(9),
      fmtTokens(totalOutput).padStart(8),
      fmtTokens(grandTotal).padStart(9),
      `${turns.length} peticiones humanas`
    ].join("  ")
  );

  // ---------- Resumen agregado ----------
  console.log("");
  console.log("TOTALES");
  console.log("=".repeat(60));
  console.log(`  Peticiones humanas:        ${turns.length}`);
  console.log(`  Asistente turns (steps):   ${totalSteps}`);
  console.log(`  Tiempo total trabajo IA:   ${fmtDuration(totalDurationMs)}`);
  const firstTs = turns[0].startedAt.getTime();
  const lastTs = turns[turns.length - 1].endedAt.getTime();
  console.log(`  Tiempo total (wall clock): ${fmtDuration(lastTs - firstTs)}`);
  console.log(`  Input tokens (nuevos):     ${totalInput.toLocaleString("es-ES")}`);
  console.log(`  Cache creation tokens:     ${totalCacheCreation.toLocaleString("es-ES")}`);
  console.log(`  Cache read tokens:         ${totalCacheRead.toLocaleString("es-ES")}`);
  console.log(`  Output tokens:             ${totalOutput.toLocaleString("es-ES")}`);
  console.log(`  TOTAL TOKENS:              ${grandTotal.toLocaleString("es-ES")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
