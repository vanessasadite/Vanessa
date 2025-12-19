
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

const MODEL_NAME = "gemini-3-flash-preview";

/**
 * Garante que a string recebida seja um JSON limpo
 */
const cleanJsonResponse = (text: string) => {
  if (!text) return "";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const getFoodSuggestions = async (query: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || query.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Liste 5 alimentos brasileiros comuns (como arroz, frango, feijão) que contenham "${query}". Retorne apenas um array JSON: ["item1", "item2", ...]`,
      config: { responseMimeType: "application/json" }
    });
    const cleaned = cleanJsonResponse(response.text);
    return JSON.parse(cleaned || "[]");
  } catch (e) {
    return [];
  }
};

export const searchFoodNutrition = async (
  foodName: string, 
  quantity: number, 
  unit: string
): Promise<Partial<FoodItem> | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Retorne os dados nutricionais para ${quantity} ${unit} de "${foodName}".
  PRIORIDADE: Tabela TACO (Brasil) ou TBCA.
  Se for algo genérico (ex: Arroz), use os valores de "Arroz branco, cozido" da TACO.
  JAMAIS retorne erro. Estime os valores se necessário.

  Retorne APENAS o JSON com estes campos:
  {
    "name": string (nome oficial da tabela),
    "calories": number (kcal totais),
    "carbs": number (g),
    "protein": number (g),
    "lipids": number (g),
    "source": "TACO"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            lipids: { type: Type.NUMBER },
            source: { type: Type.STRING }
          },
          required: ["name", "calories", "carbs", "protein", "lipids", "source"]
        }
      }
    });

    const cleaned = cleanJsonResponse(response.text);
    if (!cleaned) return null;
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Erro na busca:", error);
    return null;
  }
};
