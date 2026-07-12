import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ status: "Erro", message: "GEMINI_API_KEY não encontrada no servidor." });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    // CORREÇÃO: Uso do sufixo -latest para garantir o mapeamento do endpoint
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Diga 'Sucesso' se você estiver funcionando.");
    
    return res.status(200).json({ status: "Sucesso", aiResponse: result.response.text() });
  } catch (error: any) {
    return res.status(500).json({ status: "Erro na API da Google", message: error.message });
  }
}