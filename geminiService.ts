
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

export const searchFoodNutrition = async (foodName: string): Promise<Partial<FoodItem> | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key não encontrada.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um nutricionista especialista em tabelas brasileiras. 
      Retorne as informações nutricionais para 100g de "${foodName}". 
      OBRIGATÓRIO usar dados das tabelas: TACO, TBCA, USDA, IBGE ou Tucunduva.
      Se não encontrar o valor exato, use uma média confiável dessas fontes.
      
      Retorne estritamente um JSON com os campos: 
      "name" (nome claro), "calories" (kcal), "carbs" (g), "protein" (g), "lipids" (g), "source" (qual tabela foi usada).`,
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

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro na busca Gemini:", error);
    return null;
  }
};
