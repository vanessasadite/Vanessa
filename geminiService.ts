
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
      contents: `Calcule as informações nutricionais para 100g de "${foodName}". 
      Use como referência as tabelas: TACO, TBCA, USDA, IBGE e Tucunduva.
      Importante: Retorne apenas os valores numéricos por 100g.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nome comum do alimento em português" },
            calories: { type: Type.NUMBER, description: "Calorias (kcal)" },
            carbs: { type: Type.NUMBER, description: "Carboidratos (g)" },
            protein: { type: Type.NUMBER, description: "Proteínas (g)" },
            lipids: { type: Type.NUMBER, description: "Gorduras/Lipídeos (g)" },
            source: { type: Type.STRING, description: "Fonte da tabela utilizada" }
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
