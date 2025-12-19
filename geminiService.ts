
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

// Usando o Pro para garantir que as instruções de tabelas sejam seguidas à risca
const MODEL_NAME_SEARCH = "gemini-3-pro-preview";
const MODEL_NAME_SUGGEST = "gemini-3-flash-preview";

export const getFoodSuggestions = async (query: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || query.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_SUGGEST,
      contents: `Liste 5 nomes de alimentos que aparecem na tabela TACO (Brasil) e que contenham "${query}". Retorne APENAS um JSON: ["item1", "item2", ...]`,
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

  const prompt = `Você é um nutricionista especialista em tabelas brasileiras.
  Calcule a nutrição para: ${quantity} ${unit} de "${foodName}".

  DIRETRIZES:
  1. Prioridade Máxima: Tabela TACO (4ª Edição) ou TBCA.
  2. Secundária: Tucunduva, IBGE ou USDA.
  3. Se o alimento for "fatias" ou "unidades", use o peso médio de referência (ex: Pão de forma = 25g/fatia).
  4. JAMAIS retorne vazio. Se não houver o item exato, use o item mais próximo (ex: se não houver "Arroz X", use "Arroz Branco Cozido").

  RETORNO (JSON):
  {
    "name": "Nome do alimento encontrado",
    "calories": kcal_totais,
    "carbs": g_carboidratos,
    "protein": g_proteinas,
    "lipids": g_gorduras,
    "source": "Fonte usada (ex: TACO)"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME_SEARCH,
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

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Erro na busca:", error);
    return null;
  }
};
