
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
      contents: `Liste 5 alimentos da tabela TACO ou TBCA que comecem ou contenham "${query}". Retorne apenas uma lista de strings em JSON ["item1", "item2", ...].`,
      config: {
        responseMimeType: "application/json",
      }
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

  const prompt = `Aja como um nutricionista calculando dieta.
  ALIMENTO: "${foodName}"
  QUANTIDADE: ${quantity} ${unit}
  
  PROCEDIMENTO:
  1. Localize este alimento prioritariamente na TACO (Tabela Brasileira de Composição de Alimentos) ou TBCA.
  2. Se não houver, use Tucunduva, IBGE ou USDA.
  3. Se a unidade for "fatias", "unidades" ou "colheres", converta para gramas usando pesos médios brasileiros oficiais.
  
  RETORNO (JSON estrito):
  {
    "name": "Nome exato na tabela",
    "calories": kcal_totais,
    "carbs": g_carboidrato_total,
    "protein": g_proteina_total,
    "lipids": g_lipideos_total,
    "source": "Fonte da Tabela (Ex: TACO 4ª Edição)"
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

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro na consulta nutricional:", error);
    return null;
  }
};
