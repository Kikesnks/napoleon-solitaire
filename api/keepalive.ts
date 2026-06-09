// GET /api/keepalive
// Invocado por el cron diario de Vercel (vercel.json → crons) para generar
// actividad en Supabase y evitar que el plan gratuito pause el proyecto
// por inactividad (~1 semana sin consultas).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { selectTop } from "./_shared/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await selectTop("won", 1);
    return res.status(200).json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
}
