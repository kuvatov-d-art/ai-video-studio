
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured"
    });
  }

  const { idea } = req.body || {};

  if (typeof idea !== "string" || !idea.trim()) {
    return res.status(400).json({
      error: "Please enter a story idea"
    });
  }

  if (idea.length > 5000) {
    return res.status(400).json({
      error: "Idea is too long"
    });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-4-hydrogen",
          system_instruction:
            "Ты профессиональный сценарист AI-анимации. Создавай оригинальные, эмоциональные и кинематографичные истории на русском языке. История должна иметь сильное начало, развитие, неожиданный поворот и законченный финал. Добавляй название, персонажей и разделение на сцены.",
          input: idea,
          generation_config: {
            max_output_tokens: 4000,
            thinking_level: "medium"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API error"
      });
    }

    const texts = [];

    for (const step of data.steps || []) {
      for (const item of step.content || []) {
        if (item.type === "text" && item.text) {
          texts.push(item.text);
        }
      }
    }

    const result = data.output_text || texts.join("\n").trim();

    if (!result) {
      return res.status(502).json({
        error: "Gemini returned an empty response"
      });
    }

    return res.status(200).json({
      success: true,
      story: result
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error while generating story"
    });
  }
}
