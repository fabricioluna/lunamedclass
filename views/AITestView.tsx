// views/AITestView.tsx
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function AITestView() {
  const [prompt, setPrompt] = useState('Diga "Olá, estou funcionando!" e o nome do modelo que você é.');
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // Modelos mais prováveis de funcionarem baseados no histórico recente da API do Google
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp', // Versão experimental do 2.0 que costuma ser aberta
    'gemini-1.0-pro'
  ];

  // TESTE 1: SDK LOCAL
  const testLocalSDK = async () => {
    setLoading(true);
    setResult('Iniciando teste via SDK Local (Vite)...\n');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY não está configurada no .env.local');
      }

      setResult(prev => prev + `✓ Chave encontrada: ${apiKey.substring(0, 5)}...\n`);
      setResult(prev => prev + `✓ Instanciando GoogleGenerativeAI com modelo: ${modelName}\n`);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      setResult(prev => prev + `✓ Enviando prompt...\n`);
      const response = await model.generateContent(prompt);
      const text = await response.response.text();

      setResult(prev => prev + `\n✅ SUCESSO LOCAL:\n${text}`);
    } catch (error: any) {
      setResult(prev => prev + `\n❌ ERRO LOCAL:\n${error.message || error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // TESTE 2: FETCH VIA API DO VERCEL (Backend)
  const testVercelAPI = async () => {
    setLoading(true);
    setResult('Iniciando teste via Endpoint /api/chat...\n');

    try {
      setResult(prev => prev + `✓ Fazendo requisição POST para /api/chat...\n`);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt, 
          context: 'Teste de diagnóstico do sistema',
          mode: 'rpg' // Força o modo de teste
        }),
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResult(prev => prev + `\n✅ SUCESSO VERCEL:\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setResult(prev => prev + `\n❌ ERRO VERCEL:\n${error.message || error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-3xl mx-auto bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-blue-400 flex items-center gap-2">
          🧪 Luna Engine - Diagnóstico de IA
        </h1>

        <div className="space-y-6">
          {/* Configurações */}
          <div className="bg-slate-700 p-4 rounded border border-slate-600">
            <label className="block text-sm font-semibold mb-2">Selecione o Modelo para Teste Local:</label>
            <select 
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            >
              {modelsToTest.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-semibold mb-2">Prompt de Teste:</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white h-24"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Ações */}
          <div className="flex gap-4">
            <button 
              onClick={testLocalSDK}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition disabled:opacity-50"
            >
              Testar SDK Local (Vite)
            </button>
            <button 
              onClick={testVercelAPI}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded transition disabled:opacity-50"
            >
              Testar API Vercel (/api/chat)
            </button>
          </div>

          {/* Resultados */}
          <div>
            <label className="block text-sm font-semibold mb-2">Console de Saída:</label>
            <pre className="w-full bg-black border border-slate-700 rounded p-4 text-green-400 h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {result || "Aguardando testes..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}