
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

export const searchFoodNutrition = async (
  foodName: string, 
  quantity: number, 
  unit: 'g' | 'fatias'
): Promise<Partial<FoodItem> | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  // Prompt ultra-específico para garantir o uso das tabelas brasileiras
  const prompt = `Você é um nutricionista brasileiro altamente preciso.
  Busque os dados nutricionais de: "${quantity} ${unit} de ${foodName}".
  
  FONTES OBRIGATÓRIAS (Prioridade nesta ordem):
  1. TACO (Tabela Brasileira de Composição de Alimentos)
  2. TBCA (Tabela de Composição de Alimentos da USP)
  3. Tabela de Tucunduva
  4. IBGE (Pesquisa de Orçamentos Familiares)
  5. USDA (Apenas se não houver nas brasileiras)

  Se a unidade for "fatias", estime o peso médio de 1 fatia padrão para este alimento específico.
  
  Retorne APENAS um JSON válido seguindo este esquema:
  {
    "name": "Nome do Alimento",
    "calories": valor_kcal_total,
    "carbs": valor_g_total,
    "protein": valor_g_total,
    "lipids": valor_g_total,
    "source": "Nome da Tabela usada (Ex: TACO/TBCA)"
  }
  
  Importante: Os valores devem ser proporcionais à quantidade de ${quantity} ${unit}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    console.error("Erro Gemini:", error);
    return null;
  }
};
