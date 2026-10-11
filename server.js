require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({
  origin: allowedOrigin === "*" ? "*" : allowedOrigin.split(",").map(s => s.trim()),
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "8mb" }));

app.get("/", (_req, res) => {
  res.json({ name: "MR.SHADOW Study AI API", status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY belum diatur di backend." });
    }

    const question = String(req.body?.question || "").trim();
    const mode = String(req.body?.mode || "explain");
    if (!question) return res.status(400).json({ error: "Soal masih kosong." });
    if (question.length > 12000) {
      return res.status(413).json({ error: "Teks soal terlalu panjang (maksimal 12.000 karakter)." });
    }

    const modeInstructions = {
      explain: "Jelaskan konsep dan langkah penyelesaian soal latihan secara runtut. Jika pilihan ganda, bahas mengapa opsi paling tepat dan mengapa opsi lain kurang tepat. Akhiri dengan ringkasan singkat.",
      hint: "Jangan langsung memberi hasil akhir. Berikan petunjuk bertahap agar pelajar mencoba sendiri.",
      check: "Periksa jawaban latihan yang diberikan pelajar. Sebutkan bagian benar, bagian keliru, koreksi, dan alasan.",
      quiz: "Buat satu soal latihan serupa dari materi yang diberikan, sertakan pilihan A-D dan kunci jawaban di bagian akhir."
    };
    const instruction = modeInstructions[mode] || modeInstructions.explain;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "https://example.com",
        "X-Title": "MR.SHADOW Study AI"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Kamu adalah MR.SHADOW Study AI, pendamping belajar berbahasa Indonesia. " +
              "Bantu memahami materi, latihan, simulasi ujian, dan penilaian latihan. " +
              "Jangan mengaku pasti benar jika soal ambigu; jelaskan asumsi. " +
              "Jika pengguna menyatakan sedang mengikuti ujian aktif yang melarang bantuan AI, " +
              "jangan memberikan jawaban langsung untuk disalin; tawarkan konsep umum atau latihan serupa. " +
              instruction
          },
          { role: "user", content: question }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Penyedia AI merespons HTTP ${response.status}`;
      return res.status(response.status === 429 ? 429 : 502).json({ error: message });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: "Model AI tidak mengirim jawaban." });
    res.json({ answer, model: data?.model || MODEL });
  } catch (err) {
    console.error("chat error:", err.message);
    res.status(500).json({ error: "Gagal menghubungi AI. Periksa koneksi dan konfigurasi backend." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MR.SHADOW Study AI API berjalan di http://127.0.0.1:${PORT}`);
});
