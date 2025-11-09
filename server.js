import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
console.log("🔑 Ключ:", process.env.GOOGLE_API_KEY ? "найден" : "отсутствует");


const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api", async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || messages.length === 0)
      return res.status(400).json({ error: "Пустое сообщение" });

    const modelName = model || "gemini-2.0-flash"; // fallback
    console.log("📨 Запрос получен");
    console.log("🧩 Модель:", modelName);
    console.log("📝 Сообщений:", messages.length);

    const genModel = genAI.getGenerativeModel({ model: `models/${modelName}` });
    const result = await genModel.generateContent(messages.join("\n"));
    const text = await result.response.text();

    console.log("✅ Ответ получен");
    res.json({ reply: text });
  } catch (err) {
    console.error("❌ Ошибка:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🌐 Сервер запущен: http://localhost:${port}`);
});
