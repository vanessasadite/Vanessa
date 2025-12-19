
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

export const searchFoodNutrition = async (foodName: string): Promise<Partial<FoodItem> | null> => {
  // Inicialização direta usando a variável de ambiente injetada pela Vercel
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Forneça as informações nutricionais detalhadas para 100g de "${foodName}". 
      Procure dados especificamente nas tabelas brasileiras (TACO, TBCA, IBGE ou Tucunduva) ou USDA caso não encontre nas nacionais.
      Retorne os dados estritamente em JSON.`,
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

    // O .text extrai o resultado da geração da IA
    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro na busca por IA. Verifique se a API_KEY foi configurada na Vercel:", error);
    return null;
  }
};
