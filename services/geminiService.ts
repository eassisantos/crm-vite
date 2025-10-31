
import { GoogleGenAI, GenerateContentResponse, Type, Chat } from '@google/genai';
import { Case, Client } from '../types';

// A chave da API é obtida exclusivamente da variável de ambiente `process.env.API_KEY`.
// Assume-se que esta variável está pré-configurada e acessível no contexto de execução.
// @ts-ignore - process.env é esperado no ambiente de execução do sandbox.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("A variável de ambiente API_KEY não está definida. As funcionalidades de IA serão desativadas.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY, vertexai: true });

// Helper para tratamento de erros da API
function handleApiError(error: unknown, context: string): never {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('400')) {
            throw new Error(`[${context}] Requisição inválida. Verifique os dados enviados.`);
        }
        if (error.message.includes('429')) {
            throw new Error(`[${context}] Muitas requisições. Por favor, aguarde um momento antes de tentar novamente.`);
        }
        if (error.message.includes('500') || error.message.includes('503')) {
            throw new Error(`[${context}] O serviço de IA está temporariamente indisponível. Tente novamente mais tarde.`);
        }
        if (error.message.includes('API key not valid')) {
            throw new Error(`[${context}] A chave da API não é válida. Verifique a configuração.`);
        }
    }
    throw new Error(`[${context}] Ocorreu um erro inesperado. Verifique o console para detalhes.`);
}


let chat: Chat | null = null;

function getChatSession(): Chat {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized. Please check your API_KEY.");
  }
  if (chat) {
    return chat;
  }
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `Você é um assistente jurídico de elite para um CRM. Seu nome é JurisAI.
      - Forneça respostas claras, bem-estruturadas e concisas.
      - Use formatação markdown (negrito, itálico, listas) para melhorar a legibilidade.
      - Ao responder a perguntas que podem exigir informações atuais, use a ferramenta de busca.
      - NUNCA forneça conselhos legais. Em vez disso, forneça informações, resumos e análises baseadas nos dados disponíveis.
      - Sempre responda em português do Brasil.`,
    },
  });
  return chat;
}

export async function streamChatResponse(prompt: string, onChunk: (chunk: string) => void, onSources: (sources: any[]) => void) {
  if (!ai) {
    throw new Error("AI client not available.");
  }
  
  const chatSession = getChatSession();
  
  try {
    const result = await chatSession.sendMessageStream({
      message: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let fullResponseText = "";
    for await (const chunk of result) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullResponseText += chunkText;
        onChunk(fullResponseText);
      }
      const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const sources = groundingMetadata.groundingChunks
          .map((c: any) => c.web)
          .filter(Boolean);
        if (sources.length > 0) {
          onSources(sources);
        }
      }
    }
  } catch (error) {
    handleApiError(error, 'streamChatResponse');
  }
}

export async function generateCaseSummary(caseData: Case, client: Client): Promise<string> {
  const model = 'gemini-2.5-flash';
  
  const prompt = `
    Você é um assistente jurídico especialista.
    Com base nos seguintes detalhes do caso, gere um resumo conciso e bem estruturado em markdown.
    O resumo deve ser claro, objetivo e focado nos pontos chave. Use títulos (###), negrito (**) e quebras de linha para formatação.

    ### Detalhes do Caso
    - **Número do Processo:** ${caseData.caseNumber}
    - **Título:** ${caseData.title}
    - **Cliente:** ${client.name}
    - **Status Atual:** ${caseData.status}
    - **Tipo de Ação/Benefício:** ${caseData.benefitType}
    - **Últimas Notas/Andamentos:** ${caseData.notes}
    - **Tarefas Pendentes:** ${caseData.tasks.filter((t: any) => !t.completed).map((t: any) => t.description).join(', ') || 'Nenhuma'}

    Gere o resumo abaixo:
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { role: 'user', parts: [{ text: prompt }] },
    });
    return response.text;
  } catch (error) {
    handleApiError(error, 'generateCaseSummary');
  }
}

export async function suggestTasksFromNotes(notes: string): Promise<string> {
  const model = 'gemini-2.5-flash';

  const prompt = `
    Analise as seguintes notas de um caso jurídico e sugira uma lista de até 3 próximas ações ou tarefas em formato JSON.
    Para cada tarefa, forneça:
    1.  'description': Uma descrição clara e acionável da tarefa.
    2.  'dueDate': Uma data de vencimento sugerida no formato 'YYYY-MM-DD'. Se nenhuma data for mencionada, sugira para 7 dias a partir de hoje.
    3.  'reasoning': Uma breve justificativa do porquê a tarefa é necessária com base nas notas.

    **Notas do Caso:**
    "${notes}"

    Retorne apenas o array JSON.
  `;

  const today = new Date();
  const suggestedDueDate = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              dueDate: { type: Type.STRING, default: suggestedDueDate },
              reasoning: { type: Type.STRING },
            },
            required: ['description', 'reasoning']
          },
        },
      },
    });
    
    return response.text;
  } catch (error) {
    handleApiError(error, 'suggestTasksFromNotes');
  }
}

const clientSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        motherName: { type: Type.STRING },
        fatherName: { type: Type.STRING },
        cpf: { type: Type.STRING },
        rg: { type: Type.STRING },
        rgIssuer: { type: Type.STRING },
        rgIssuerUF: { type: Type.STRING },
        dataEmissao: { type: Type.STRING },
        dateOfBirth: { type: Type.STRING },
        nacionalidade: { type: Type.STRING },
        naturalidade: { type: Type.STRING },
        estadoCivil: { type: Type.STRING },
        profissao: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        cep: { type: Type.STRING },
        street: { type: Type.STRING },
        number: { type: Type.STRING },
        complement: { type: Type.STRING },
        neighborhood: { type: Type.STRING },
        city: { type: Type.STRING },
        state: { type: Type.STRING },
    }
};

export async function extractClientInfoFromDocument(text: string, documentType: string): Promise<string> {
    const model = 'gemini-2.5-flash';
    const prompt = `Extraia as seguintes informações de um(a) **${documentType}**. O texto foi extraído de um documento. Retorne em formato JSON. Se uma informação não for encontrada, retorne uma string vazia para a chave correspondente. Formate datas como YYYY-MM-DD.\n\nTexto:\n${text}`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: clientSchema,
            }
        });
        return response.text;
    } catch (error) {
        handleApiError(error, 'extractClientInfoFromDocument');
    }
}

export async function extractClientInfoFromImage(base64Image: string, mimeType: string, documentType: string): Promise<string> {
    const model = 'gemini-2.5-flash';
    const prompt = `Extraia as informações desta imagem de um(a) **${documentType}** e retorne em formato JSON. Se uma informação não for encontrada, retorne uma string vazia. Formate datas como YYYY-MM-DD.`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                role: 'user',
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: clientSchema,
            }
        });
        return response.text;
    } catch (error) {
        handleApiError(error, 'extractClientInfoFromImage');
    }
}

export async function classifyDocument(
  documentContent: string, // Can be text or base64 image data
  mimeType: string | null, // Mime type if it's an image, null if text
  checklist: string[]
): Promise<string> {
  const model = 'gemini-2.5-flash';
  
  const prompt = `
    Você é um assistente de escritório de advocacia especializado em triagem de documentos.
    Sua tarefa é classificar o documento fornecido em uma das seguintes categorias:
    [${checklist.join(', ')}, Outro]

    Analise o conteúdo do documento e retorne APENAS o nome exato da categoria da lista que melhor o descreve.
    Se o documento não se encaixar claramente em nenhuma das categorias da lista, retorne "Outro".
    Não adicione nenhuma explicação ou formatação, apenas o nome da categoria.
  `;

  const parts: any[] = [];
  if (mimeType && documentContent) {
    parts.push({ inlineData: { mimeType, data: documentContent } });
    parts.push({ text: prompt });
  } else {
    parts.push({ text: `Conteúdo do documento (texto extraído): "${documentContent}"\n\n${prompt}` });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { role: 'user', parts },
    });
    
    const classification = response.text.trim();
    
    const validCategories = [...checklist, 'Outro'];
    if (validCategories.map(v => v.toLowerCase()).includes(classification.toLowerCase())) {
      // Find the original casing
      const originalCategory = validCategories.find(v => v.toLowerCase() === classification.toLowerCase());
      return originalCategory || 'Outro';
    }
    
    console.warn(`AI classification returned an unexpected value: "${classification}". Defaulting to "Outro".`);
    return 'Outro';

  } catch (error) {
    handleApiError(error, 'classifyDocument');
  }
}
