import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const parseReceiptImage = async (base64Image: string): Promise<any> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                }
            },
            {
                text: "Analyze this receipt image. Extract the items purchased. For each item, identify the name, quantity (default to 1 if not specified), unit (kg, g, l, un, etc), and total price for that line item. Return ONLY a JSON object."
            }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Date of purchase YYYY-MM-DD" },
            total: { type: Type.NUMBER, description: "Total amount paid" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  totalPrice: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};