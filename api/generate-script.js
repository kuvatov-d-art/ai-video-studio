
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

       function collectText(value, result = []) {
      if (!value) return result;

      if (Array.isArray(value)) {
        for (const item of value) {
          collectText(item, result);
        }
        return result;
      }

      if (typeof value === "object") {
        if (value.type === "text" && typeof value.text === "string") {
          result.push(value.text);
        }

        for (const [key, item] of Object.entries(value)) {
          if (
            (key === "output_text" || key === "outputText") &&
            typeof item === "string"
          ) {
            result.push(item);
          } else if (typeof item === "object" && item !== null) {
            collectText(item, result);
          }
        }
      }

      return result;
    }

    const result = [...new Set(collectText(data))]
      .join("\n")
      .trim();

    if (!result) {
      return res.status(502).json({
        error: "Gemini не вернул текст. Статус: " +
          (data.status || "неизвестен") +
          ". Типы шагов: " +
          (data.steps || []).map(step => step.type).join(", ")
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
