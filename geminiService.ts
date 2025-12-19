
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

const SUGGEST_MODEL = "gemini-3-flash-preview";
const SEARCH_MODEL = "gemini-3-pro-preview"; // Usando Pro para maior precisão em tabelas

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
      model: SUGGEST_MODEL,
      contents: `Sugira 5 alimentos brasileiros que contenham "${query}". Retorne APENAS um array JSON de strings: ["item1", "item2", ...]`,
      config: { responseMimeType: "application/json" }
    });
    const cleaned = cleanJsonResponse(response.text || "[]");
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Erro ao sugerir alimentos:", e);
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

  // Prompt explícito citando as tabelas solicitadas
  const prompt = `Aja como um banco de dados nutricional oficial. 
  Consulte as tabelas: TACO (4ª Edição), TBCA, USDA, IBGE e Tucunduva.
  
  Desejo os dados para: ${quantity} ${unit} de "${foodName}".
  
  REGRAS:
  1. Identifique o alimento mais próximo nas tabelas citadas (prioridade TACO/TBCA).
  2. Converta unidades caseiras (fatias, colheres) para gramas se necessário.
  3. Calcule o total de calorias (kcal), carboidratos (g), proteínas (g) e lipídeos/gorduras (g).
  4. Se não encontrar o exato, use uma média confiável das tabelas para o alimento em questão.
  
  Retorne APENAS o JSON no seguinte formato:
  {
    "name": "Nome Completo do Alimento Encontrado",
    "calories": valor_numérico,
    "carbs": valor_numérico,
    "protein": valor_numérico,
    "lipids": valor_numérico,
    "source": "Nome da Tabela de Origem (ex: TACO)"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
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

    const cleaned = cleanJsonResponse(response.text || "");
    if (!cleaned) throw new Error("Resposta vazia da IA");
    
    const data = JSON.parse(cleaned);
    return data;
  } catch (error) {
    console.error("Erro crítico na busca nutricional:", error);
    return null;
  }
};
