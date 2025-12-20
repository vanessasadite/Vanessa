
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

const MODEL_NAME = "gemini-3-flash-preview";

const cleanJsonResponse = (text: string) => {
  if (!text) return "";
  // Remove blocos de código markdown se existirem
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const getFoodSuggestions = async (query: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || query.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Liste 5 alimentos brasileiros comuns que contenham "${query}". Retorne apenas um array JSON de strings: ["item1", "item2", ...]`,
      config: { responseMimeType: "application/json" }
    });
    const cleaned = cleanJsonResponse(response.text || "[]");
    return JSON.parse(cleaned);
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

  // Prompt ultra-específico com foco total nas tabelas solicitadas
  const prompt = `Você é um especialista em nutrição clínica e tabelas de composição de alimentos.
  
  Sua tarefa é extrair os dados nutricionais para: ${quantity} ${unit} de "${foodName}".
  
  REGRAS OBRIGATÓRIAS:
  1. Use os dados exatos das tabelas: TACO (4ª Edição), TBCA, USDA, IBGE e Tucunduva.
  2. Priorize tabelas brasileiras (TACO/TBCA).
  3. Se o usuário fornecer uma medida caseira (fatias, colheres), converta primeiro para gramas (ex: 1 fatia de pão de forma = 25g) e então calcule os macros.
  4. Retorne valores numéricos precisos.
  5. Se o alimento for genérico como "Arroz", use "Arroz, integral, cozido" ou "Arroz, branco, cozido" conforme a busca sugerir.
  6. Nunca retorne erro; se não encontrar o item exato, use a estimativa mais próxima da TACO.

  Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON:
  {
    "name": "Nome do alimento na tabela",
    "calories": calorias_totais_para_quantidade,
    "carbs": carboidratos_em_gramas,
    "protein": proteinas_em_gramas,
    "lipids": gorduras_em_gramas,
    "source": "Nome da Tabela usada (TACO, TBCA, etc)"
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

    const cleaned = cleanJsonResponse(response.text || "");
    if (!cleaned) return null;
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Erro na consulta nutricional:", error);
    return null;
  }
};
