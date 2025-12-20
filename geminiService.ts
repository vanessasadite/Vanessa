
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "./types";

const MODEL_NAME = "gemini-3-flash-preview";

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
      model: MODEL_NAME,
      contents: `Sugira 5 nomes de alimentos que contenham "${query}". Retorne APENAS um array JSON de strings: ["item1", "item2", ...]`,
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

  // Prompt extremamente diretivo focado nas tabelas solicitadas
  const prompt = `Aja como um banco de dados de Nutrição Humana. 
  Consulte OBRIGATORIAMENTE nesta ordem de prioridade: 
  1. TACO (Tabela Brasileira de Composição de Alimentos - Unicamp)
  2. TBCA (Tabela Brasileira de Composição de Alimentos - USP)
  3. IBGE (Pesquisa de Orçamentos Familiares)
  4. Tucunduva (Tabela de Composição de Alimentos)
  5. USDA (FoodData Central)

  Busque os dados para: ${quantity} ${unit} de "${foodName}".

  REGRAS:
  - Se a unidade for caseira (colher, fatia, xícara), converta para gramas seguindo a Tucunduva ou IBGE antes de calcular.
  - Se o alimento for genérico, use o correspondente padrão da TACO.
  - Se não encontrar exatamente, forneça a melhor estimativa baseada nessas tabelas. NÃO RETORNE ERRO.
  
  Retorne APENAS o JSON:
  {
    "name": "Nome do Alimento Conforme a Tabela",
    "calories": calorias_totais_em_kcal,
    "carbs": carboidratos_em_g,
    "protein": proteinas_em_g,
    "lipids": gorduras_em_g,
    "source": "Nome da Tabela de Origem (Ex: TACO/Unicamp)"
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
    console.error("Erro na busca nutricional:", error);
    // Fallback manual para evitar que o app trave em itens básicos caso a API falhe
    if (foodName.toLowerCase().includes("arroz")) {
        return { name: "Arroz branco, cozido", calories: 128 * (quantity/100), carbs: 28 * (quantity/100), protein: 2.5 * (quantity/100), lipids: 0.2 * (quantity/100), source: "TACO (Fallback)" };
    }
    return null;
  }
};
