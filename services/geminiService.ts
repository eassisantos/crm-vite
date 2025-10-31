import { Case, Client } from '../types';

const RAW_PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL || '').trim();
const PROXY_BASE = RAW_PROXY_URL.replace(/\/$/, '');

export const isGeminiAvailable = PROXY_BASE.length > 0;

if (!isGeminiAvailable && import.meta.env.DEV) {
  console.warn('VITE_AI_PROXY_URL não está definida. As funcionalidades de IA serão executadas em modo de fallback.');
}

const FALLBACK_TEXT = 'IA indisponível no momento. Por favor, tente novamente mais tarde.';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[GeminiService]', ...args);
  }
};

class ProxyRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ProxyRequestError';
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
      devLog('Resposta JSON inválida recebida do proxy de IA.', error, text);
      throw new ProxyRequestError('O proxy de IA retornou uma resposta inválida.', response.status);
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

async function postToProxy<T>(path: string, payload: unknown, context: string): Promise<T> {
  if (!isGeminiAvailable) {
    throw new ProxyRequestError('Proxy de IA não configurado.', 503);
  }

  const url = `${PROXY_BASE}${path}`;

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
    throw new ProxyRequestError('Não foi possível conectar ao proxy de IA.', undefined);
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      (typeof body === 'string' && body) ||
      body?.error ||
      body?.message ||
      `Falha ao se comunicar com o proxy de IA (${response.status}).`;
    throw new ProxyRequestError(message, response.status);
  }

  return body as T;
}

function handleProxyError(error: unknown, context: string): never {
  if (import.meta.env.DEV) {
    console.error(`[GeminiService] ${context}`, error);
  }

  if (error instanceof ProxyRequestError) {
    if (error.status === 401 || error.status === 403) {
      throw new Error(`[${context}] Acesso negado pelo proxy de IA. Verifique as credenciais do servidor.`);
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
  onSources: (sources: any[]) => void
) {
  if (!isGeminiAvailable) {
    devLog('streamChatResponse fallback acionado.');
    onChunk(FALLBACK_TEXT);
    onSources([]);
    return;
  }

  try {
    const data = await postToProxy<{ text?: string; answer?: string; message?: string; sources?: any[] }>(
      '/chat',
      { prompt },
      'streamChatResponse'
    );

    const responseText = data?.text || data?.answer || data?.message || '';
    onChunk(responseText || FALLBACK_TEXT);
    onSources(Array.isArray(data?.sources) ? data.sources : []);
  } catch (error) {
    handleProxyError(error, 'streamChatResponse');
  }
}

export async function generateCaseSummary(caseData: Case, client: Client): Promise<string> {
  if (!isGeminiAvailable) {
    devLog('generateCaseSummary fallback acionado.');
    return FALLBACK_TEXT;
  }

  try {
    const data = await postToProxy<{ summary?: string; text?: string; message?: string }>(
      '/case-summary',
      { case: caseData, client },
      'generateCaseSummary'
    );
    return data?.summary || data?.text || data?.message || FALLBACK_TEXT;
  } catch (error) {
    handleProxyError(error, 'generateCaseSummary');
  }
}

export async function suggestTasksFromNotes(notes: string): Promise<string> {
  if (!isGeminiAvailable) {
    devLog('suggestTasksFromNotes fallback acionado.');
    return '[]';
  }

  try {
    const data = await postToProxy<{ tasks?: string; suggestions?: unknown; text?: string }>(
      '/suggest-tasks',
      { notes },
      'suggestTasksFromNotes'
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
    handleProxyError(error, 'suggestTasksFromNotes');
  }
}

export async function extractClientInfoFromDocument(text: string, documentType: string): Promise<string> {
  if (!isGeminiAvailable) {
    devLog('extractClientInfoFromDocument fallback acionado.');
    return '{}';
  }

  try {
    const data = await postToProxy<{ json?: string; data?: unknown }>(
      '/client-info/from-document',
      { text, documentType },
      'extractClientInfoFromDocument'
    );

    if (typeof data?.json === 'string') {
      return data.json;
    }

    if (data && typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data);
      } catch (error) {
        devLog('Falha ao converter resposta do proxy em JSON.', error, data);
      }
    }

    return '{}';
  } catch (error) {
    handleProxyError(error, 'extractClientInfoFromDocument');
  }
}

export async function extractClientInfoFromImage(
  base64Image: string,
  mimeType: string,
  documentType: string
): Promise<string> {
  if (!isGeminiAvailable) {
    devLog('extractClientInfoFromImage fallback acionado.');
    return '{}';
  }

  try {
    const data = await postToProxy<{ json?: string; data?: unknown }>(
      '/client-info/from-image',
      { base64Image, mimeType, documentType },
      'extractClientInfoFromImage'
    );

    if (typeof data?.json === 'string') {
      return data.json;
    }

    if (data && typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data);
      } catch (error) {
        devLog('Falha ao converter resposta do proxy em JSON.', error, data);
      }
    }

    return '{}';
  } catch (error) {
    handleProxyError(error, 'extractClientInfoFromImage');
  }
}

export async function classifyDocument(
  documentContent: string,
  mimeType: string | null,
  checklist: string[]
): Promise<string> {
  if (!isGeminiAvailable) {
    devLog('classifyDocument fallback acionado.');
    return 'Outro';
  }

  try {
    const data = await postToProxy<{ classification?: string; category?: string }>(
      '/classify-document',
      { documentContent, mimeType, checklist },
      'classifyDocument'
    );

    const rawClassification = (data?.classification || data?.category || '').trim();
    if (!rawClassification) {
      return 'Outro';
    }

    const normalized = rawClassification.toLowerCase();
    const validCategories = [...checklist, 'Outro'];
    const match = validCategories.find((option) => option.toLowerCase() === normalized);

    return match || 'Outro';
  } catch (error) {
    handleProxyError(error, 'classifyDocument');
  }
}
