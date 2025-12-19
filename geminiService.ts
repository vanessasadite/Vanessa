
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

const MODEL_NAME = "gemini-3-flash-preview";

export const getFoodSuggestions = async (query: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || query.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Sugira 5 alimentos comuns que existam na tabela TACO (Brasil) e que comecem com "${query}". Retorne apenas um array JSON de strings.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
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

  const prompt = `Aja como um Nutricionista. Busque os dados nutricionais de "${quantity} ${unit} de ${foodName}".
  PRIORIDADE: Tabela TACO ou TBCA (Brasil). 
  Se não encontrar o item exato, use o equivalente mais comum da TACO. 
  NUNCA retorne nulo. Estime os valores se necessário baseando-se em alimentos similares.

  Retorne este JSON:
  {
    "name": "Nome do Alimento",
    "calories": kcal_totais,
    "carbs": carboidratos_g,
    "protein": proteinas_g,
    "lipids": gorduras_g,
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

    const data = JSON.parse(response.text || "null");
    return data;
  } catch (error) {
    console.error("Erro na busca Gemini:", error);
    // Fallback manual básico para evitar que o app trave se a IA falhar
    return null;
  }
};
