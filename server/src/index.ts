import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function sendSse(res: Response, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Prompt cannot be empty.",
      });
    }

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Give clear, concise, and beginner friendly answers.",
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 500,
      stream: true,
    });

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        sendSse(res, { type: "token", content: text });
      }
    }

    sendSse(res, { type: "done" });
    res.end();
  } catch (error) {
    console.error("Groq API Error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Something went wrong while generating the AI response.",
      });
    }

    sendSse(res, {
      type: "error",
      message: "Something went wrong while generating the AI response.",
    });
    res.end();
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
