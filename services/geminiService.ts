import { GoogleGenAI, Tool, GenerateContentResult } from "@google/genai";
import { ChatMessage } from '../types';

// NOTE: Using process.env.API_KEY as strictly required.
const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
const getClient = (apiKeyOverride?: string) => {
  return new GoogleGenAI({ apiKey: apiKeyOverride || API_KEY });
};

export const streamChatResponse = async (
  history: ChatMessage[],
  newMessage: string,
  onChunk: (text: string) => void,
  onSources: (sources: any[]) => void
) => {
  const ai = getClient();
  const modelId = 'gemini-2.5-flash'; // Use Flash for fast chat

  // Decide tools based on user query simple heuristic
  const tools: Tool[] = [];
  const lowerMsg = newMessage.toLowerCase();
  
  // Add search if asking for info, news, recent events
  if (lowerMsg.includes('find') || lowerMsg.includes('search') || lowerMsg.includes('news') || lowerMsg.includes('channels') || lowerMsg.includes('list')) {
    tools.push({ googleSearch: {} });
  }
  
  // Add maps if asking for location
  if (lowerMsg.includes('where') || lowerMsg.includes('location') || lowerMsg.includes('map') || lowerMsg.includes('near')) {
    tools.push({ googleMaps: {} });
  }

  try {
    const chatSession = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: "You are a helpful assistant for the GlobalStream IPTV app. You help users find TV channels, understand channel content, and locate broadcasters. Use Search Grounding to find up-to-date channel lists and stream URLs if possible. Use Maps Grounding to locate headquarters.",
        tools: tools.length > 0 ? tools : undefined,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const resultStream = await chatSession.sendMessageStream({ message: newMessage });

    for await (const chunk of resultStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
      
      // Extract grounding metadata if present
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
         const sources: any[] = [];
         groundingChunks.forEach((gc: any) => {
            if (gc.web) {
              sources.push({ uri: gc.web.uri, title: gc.web.title });
            }
            if (gc.maps) {
              sources.push({ uri: gc.maps.googleMapsUri, title: gc.maps.title });
            }
         });
         if (sources.length > 0) {
           onSources(sources);
         }
      }
    }
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    onChunk("\n[Error generating response. Please try again.]");
  }
};

export const generateVeoVideo = async (
  prompt: string,
  base64Image: string, 
  mimeType: string
): Promise<string | null> => {
  // Veo requires user-selected API key via aistudio.
  // Check if available on window (simulated environment check)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiStudio = (window as any).aistudio;
  
  if (aiStudio) {
    const hasKey = await aiStudio.hasSelectedApiKey();
    if (!hasKey) {
       await aiStudio.openSelectKey();
       // Race condition mitigation: simple delay or assume success if they closed modal
       await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
  }

  // Create a NEW client instance to ensure we pick up the potentially newly selected key (which injects into process.env.API_KEY automatically in some envs, or we rely on the default behavior)
  // However, for Veo specifically in this context, we proceed with standard pattern.
  const ai = getClient(); 

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animate this scene cinematically",
      image: {
        imageBytes: base64Image,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9' // Default to landscape
      }
    });

    // Polling
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (videoUri) {
        // Fetch the actual bytes via the signed link (appending API key is required per docs)
        const videoRes = await fetch(`${videoUri}&key=${API_KEY}`);
        const videoBlob = await videoRes.blob();
        return URL.createObjectURL(videoBlob);
    }
    return null;

  } catch (error) {
    console.error("Veo Generation Error:", error);
    throw error;
  }
};

export const searchChannelsForCountry = async (countryName: string): Promise<string> => {
  const ai = getClient();
  // Using search tool to find actual channels if API data is sparse
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `List the top 5 most popular free IPTV channels in ${countryName} that might be found in the iptv-org repository. Return a simple bulleted list with a short description for each.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return response.text || "No details found.";
  } catch (e) {
    console.error(e);
    return "Could not fetch channel details.";
  }
}
