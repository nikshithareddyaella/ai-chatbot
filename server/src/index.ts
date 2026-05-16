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

app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Prompt cannot be empty.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Give clear, concise, and beginner friendly answers.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 500,
    });

    const reply =
      completion.choices[0]?.message?.content || "No response generated.";

    return res.json({ reply });
  } catch (error) {
    console.error("Groq API Error:", error);

    return res.status(500).json({
      error: "Something went wrong while generating the AI response.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});