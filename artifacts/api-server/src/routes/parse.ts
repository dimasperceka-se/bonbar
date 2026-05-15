import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ParseRequestBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/parse", requireAuth, async (req, res) => {
  const parsed = ParseRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { text } = parsed.data;

  const systemPrompt = `You are an assistant that parses natural language goods requests for a Correctional Facility (Lembaga Pemasyarakatan) in Indonesia and extracts structured item data.

Extract items from the user's request and return ONLY valid JSON in this exact format:
{
  "items": [
    {"no": 1, "name": "Kertas HVS F4", "qty": "1 Rim", "purpose": "Untuk Keperluan Seksi Kamtib"},
    {"no": 2, "name": "Lakban bening", "qty": "5 Roll", "purpose": "Untuk Keperluan Ruang Pendaftaran"}
  ]
}

Rules:
- Normalize item names to formal Indonesian (e.g. "HVS paper" → "Kertas HVS A4", "kanebo" → "Kanebo", "sunlight" → "Sunlight", "lakban" → "Lakban bening", "spidol" → "Spidol Permanen", "tinta epson" → "Tinta Epson L310")
- Format quantity with unit (e.g. "2 Rim", "1 buah", "1 pouch", "5 Roll", "1 pak", "1 botol")
- Purpose should be "Untuk Keperluan [Section Name]" in Indonesian
- Group items by the section/purpose they are for
- Number items sequentially starting from 1
- Support both Indonesian and English input
- Return ONLY the JSON, no other text`;

  if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    res.status(503).json({ error: "OPENAI_API_KEY belum dikonfigurasi di server" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { items: Array<{ no: number; name: string; qty: string; purpose: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { items: [] };
    }

    res.json({ items: parsed.items ?? [] });
  } catch (err) {
    req.log.error({ err }, "AI parse error");
    res.status(500).json({ error: "Gagal memproses permintaan AI" });
  }
});

export default router;
