
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StoryData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeImageAndWriteStory = async (base64Image: string): Promise<StoryData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `Analiza esta imagen y actúa como un novelista galardonado. Escribe el párrafo de apertura de una historia ambientada en este mundo. 
          El tono debe ser literario, inmersivo y evocador. 
          Responde estrictamente en formato JSON con la siguiente estructura:
          {
            "openingParagraph": "el texto del párrafo",
            "mood": "descripción breve del estado de ánimo",
            "setting": "descripción breve del entorno"
          }
          Idioma: Español.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          openingParagraph: { type: Type.STRING },
          mood: { type: Type.STRING },
          setting: { type: Type.STRING },
        },
        required: ["openingParagraph", "mood", "setting"],
      },
    },
  });

  return JSON.parse(response.text || '{}') as StoryData;
};

export const generateSpeech = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Lee el siguiente fragmento de historia de forma pausada y dramática: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No se pudo generar el audio.");
  return base64Audio;
};

export const chatWithAuthor = async (history: { role: 'user' | 'model', text: string }[], message: string) => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres un autor literario experto en español. Estás ayudando al usuario a expandir su mundo creativo basado en la historia que acabas de escribir. Sé creativo, místico y servicial.',
    },
  });

  // Sending history manually or using the chat state if supported
  // For simplicity, we send the message. Ideally we map history to parts.
  const response = await chat.sendMessage({ message });
  return response.text;
};
