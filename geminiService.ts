
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

const MODEL_SEARCH = "gemini-3-pro-preview";
const MODEL_SUGGEST = "gemini-3-flash-preview";

/**
 * Limpa strings de resposta da IA que podem vir com markdown de JSON
 */
const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const getFoodSuggestions = async (query: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || query.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_SUGGEST,
      contents: `Liste apenas 5 nomes de alimentos brasileiros comuns (como arroz, feijão, frango) que comecem ou contenham "${query}". Retorne apenas um array JSON de strings ["item1", "item2", ...].`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonResponse(response.text || "[]"));
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

  // Prompt ultra-descritivo para evitar falhas em alimentos básicos
  const prompt = `Aja como um Nutricionista calculando dieta com precisão.
  
  OBJETIVO: Fornecer os dados nutricionais exatos para: ${quantity} ${unit} de "${foodName}".
  
  INSTRUÇÕES CRÍTICAS:
  1. Use prioritariamente a Tabela TACO (4ª Edição) ou TBCA.
  2. Se o usuário digitar algo genérico como "Arroz", assuma "Arroz branco, cozido" da TACO.
  3. Se o usuário digitar "Frango", assuma "Peito de frango, sem pele, grelhado/cozido".
  4. Converta unidades (fatias, colheres) para gramas antes de calcular (Ex: 1 fatia de pão = 25g).
  5. NUNCA RETORNE ERRO. Se não souber o exato, use a estimativa mais segura para o alimento mais similar.

  RESPOSTA (JSON estrito):
  {
    "name": "Nome do Alimento (Ex: Arroz Branco Cozido)",
    "calories": valor_kcal,
    "carbs": gramas_carboidrato,
    "protein": gramas_proteina,
    "lipids": gramas_gordura,
    "source": "TACO ou TBCA"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_SEARCH,
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

    const text = cleanJsonResponse(response.text || "null");
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro na consulta Gemini:", error);
    return null;
  }
};
