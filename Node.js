import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Тестовый эндпоинт
app.get('/api/test', (req, res) => {
  console.log('✅ Тестовый запрос получен');
  res.json({ 
    status: 'работает', 
    hasApiKey: !!GEMINI_API_KEY,
    apiKeyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0
  });
});

// Основной эндпоинт
app.post('/api/ask', async (req, res) => {
  console.log('\n========================================');
  console.log('📨 ПОЛУЧЕН ЗАПРОС ОТ КЛИЕНТА');
  console.log('========================================');
  
  try {
    const { messages } = req.body;
    console.log('📝 Количество сообщений:', messages ? messages.length : 0);

    // Проверка API ключа
    if (!GEMINI_API_KEY) {
      console.error('❌ API КЛЮЧ НЕ НАЙДЕН');
      return res.json({ 
        assistant: 'Ошибка: API ключ не настроен. Создайте .env файл с GEMINI_API_KEY=ваш_ключ' 
      });
    }
    console.log('🔑 API ключ найден, длина:', GEMINI_API_KEY.length);

    // Проверка сообщений
    if (!messages || messages.length === 0) {
      console.error('❌ НЕТ СООБЩЕНИЙ');
      return res.json({ assistant: 'Ошибка: нет сообщений' });
    }

    // Формируем историю для Gemini
    const geminiMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    console.log('📤 Отправляем в Gemini API...');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Статус ответа:', response.status, response.statusText);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ ОШИБКА API:', responseText);
      return res.json({ 
        assistant: `Ошибка Gemini API (${response.status}): ${responseText.substring(0, 300)}` 
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Не удалось распарсить JSON');
      return res.json({ 
        assistant: 'Ошибка: некорректный ответ от Gemini API' 
      });
    }

    console.log('📦 Структура ответа:', JSON.stringify(data, null, 2));

    // Извлекаем текст ответа
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      console.error('❌ НЕТ ТЕКСТА В ОТВЕТЕ');
      console.error('Полный ответ:', JSON.stringify(data, null, 2));
      
      // Проверяем причину блокировки
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason) {
        return res.json({ 
          assistant: `Ответ заблокирован: ${finishReason}. Попробуйте переформулировать вопрос.` 
        });
      }
      
      return res.json({ 
        assistant: 'Ошибка: Gemini не вернул текст ответа' 
      });
    }

    console.log('✅ УСПЕШНО! Ответ получен');
    console.log('Длина ответа:', answer.length, 'символов');
    console.log('========================================\n');
    
    res.json({ assistant: answer });

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error('Stack:', error.stack);
    res.json({ 
      assistant: `Критическая ошибка сервера: ${error.message}` 
    });
  }
});

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   🚀 MonoClaude Server Started       ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`\n🌐 URL: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY ? '✅ Найден (' + GEMINI_API_KEY.length + ' символов)' : '❌ НЕ НАЙДЕН!'}`);
  
  if (!GEMINI_API_KEY) {
    console.log('\n⚠️  ВНИМАНИЕ! Создайте файл .env с содержимым:');
    console.log('GEMINI_API_KEY=ваш_ключ_здесь');
  }
  
  console.log('\n📝 Тестовый эндпоинт: http://localhost:3000/api/test');
  console.log('═══════════════════════════════════════\n');
});