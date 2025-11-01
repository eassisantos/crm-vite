import { Case, Client } from '../types';

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
const API_PREFIX = RAW_BASE_URL.length > 0 ? RAW_BASE_URL : '';
const API_BASE = `${API_PREFIX}/api/ai`;

const AI_DISABLED = (import.meta.env.VITE_DISABLE_AI ?? '').toLowerCase() === 'true';
const API_CONFIGURED = API_PREFIX.length > 0 || !import.meta.env.DEV;

export const isGeminiAvailable = !AI_DISABLED && API_CONFIGURED;

const FALLBACK_TEXT = 'IA indisponível no momento. Por favor, tente novamente mais tarde.';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[AIService]', ...args);
  }
};

class AiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiRequestError';
    this.status = status;
  }
}

async function parseResponseBody(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (error) {
      devLog('Resposta JSON inválida recebida do endpoint de IA.', error, text);
      throw new AiRequestError('O serviço de IA retornou uma resposta inválida.', response.status);
    }
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text };
  }
}

async function postToAi<T>(path: string, payload: unknown, context: string): Promise<T> {
  if (!isGeminiAvailable) {
    throw new AiRequestError('O serviço de IA está desativado para este ambiente.', 503);
  }
  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch (error) {
    devLog(`Erro de rede em ${context}`, error);
    throw new AiRequestError('Não foi possível conectar ao serviço de IA.', undefined);
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      (typeof body === 'string' && body) ||
      body?.error ||
      body?.message ||
      `Falha ao se comunicar com o serviço de IA (${response.status}).`;
    throw new AiRequestError(message, response.status);
  }

  return body as T;
}

function handleAiError(error: unknown, context: string): never {
  if (import.meta.env.DEV) {
    console.error(`[AIService] ${context}`, error);
  }

  if (error instanceof AiRequestError) {
    if (error.status === 401 || error.status === 403) {
      throw new Error(`[${context}] Acesso negado pelo serviço de IA. Verifique as credenciais configuradas no Worker.`);
    }
    if (error.status === 429) {
      throw new Error(`[${context}] Muitas requisições. Aguarde um momento antes de tentar novamente.`);
    }
    if (error.status && error.status >= 500) {
      throw new Error(`[${context}] O serviço de IA está temporariamente indisponível. Tente novamente mais tarde.`);
    }
    throw new Error(`[${context}] ${error.message}`);
  }

  if (error instanceof Error) {
    throw new Error(`[${context}] ${error.message}`);
  }

  throw new Error(`[${context}] Não foi possível processar sua solicitação no momento.`);
}

export async function streamChatResponse(
  prompt: string,
  onChunk: (chunk: string) => void,
  onSources: (sources: any[]) => void,
) {
  try {
    const data = await postToAi<{ text?: string; answer?: string; message?: string; sources?: any[] }>(
      '/chat',
      { prompt },
      'streamChatResponse',
    );

    const responseText = data?.text || data?.answer || data?.message || '';
    onChunk(responseText || FALLBACK_TEXT);
    onSources(Array.isArray(data?.sources) ? data.sources : []);
  } catch (error) {
    handleAiError(error, 'streamChatResponse');
  }
}

export async function generateCaseSummary(caseData: Case, client: Client): Promise<string> {
  try {
    const data = await postToAi<{ summary?: string; text?: string; message?: string }>(
      '/case-summary',
      { case: caseData, client },
      'generateCaseSummary',
    );
    return data?.summary || data?.text || data?.message || FALLBACK_TEXT;
  } catch (error) {
    handleAiError(error, 'generateCaseSummary');
  }
}

export async function suggestTasksFromNotes(notes: string): Promise<string> {
  try {
    const data = await postToAi<{ tasks?: string; suggestions?: unknown; text?: string }>(
      '/suggest-tasks',
      { notes },
      'suggestTasksFromNotes',
    );

    if (typeof data?.tasks === 'string') {
      return data.tasks;
    }
    if (Array.isArray((data as any)?.suggestions)) {
      return JSON.stringify((data as any).suggestions);
    }
    if (typeof data?.text === 'string') {
      return data.text;
    }
    return '[]';
  } catch (error) {
    handleAiError(error, 'suggestTasksFromNotes');
  }
}

export async function extractClientInfoFromDocument(text: string, documentType: string): Promise<string> {
  try {
    const data = await postToAi<{ json?: string; data?: unknown }>(
      '/client-info/from-document',
      { text, documentType },
      'extractClientInfoFromDocument',
    );

    if (typeof data?.json === 'string') {
      return data.json;
    }

    if (data && typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data);
      } catch (error) {
        devLog('Falha ao converter resposta do serviço de IA em JSON.', error, data);
      }
    }

    return '{}';
  } catch (error) {
    handleAiError(error, 'extractClientInfoFromDocument');
  }
}

export async function extractClientInfoFromImage(
  base64Image: string,
  mimeType: string,
  documentType: string,
): Promise<string> {
  try {
    const data = await postToAi<{ json?: string; data?: unknown }>(
      '/client-info/from-image',
      { base64Image, mimeType, documentType },
      'extractClientInfoFromImage',
    );

    if (typeof data?.json === 'string') {
      return data.json;
    }

    if (data && typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data);
      } catch (error) {
        devLog('Falha ao converter resposta do serviço de IA em JSON.', error, data);
      }
    }

    return '{}';
  } catch (error) {
    handleAiError(error, 'extractClientInfoFromImage');
  }
}

export async function classifyDocument(
  documentContent: string,
  mimeType: string | null,
  checklist: string[],
): Promise<string> {
  try {
    const data = await postToAi<{ classification?: string; category?: string }>(
      '/classify-document',
      { documentContent, mimeType, checklist },
      'classifyDocument',
    );

    const rawClassification = (data?.classification || data?.category || '').trim();
    if (!rawClassification) {
      return 'Outro';
    }

    const normalized = rawClassification.toLowerCase();
    const validCategories = [...checklist, 'Outro'];
    const match = validCategories.find(option => option.toLowerCase() === normalized);

    return match || 'Outro';
  } catch (error) {
    handleAiError(error, 'classifyDocument');
  }
}
