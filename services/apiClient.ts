import type {
  Case,
  CaseDocument,
  Client,
  Expense,
  Fee,
  SettingsState,
} from '../types';

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
const API_BASE_URL = RAW_BASE_URL.length > 0 ? RAW_BASE_URL : '';

const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { ...DEFAULT_HEADERS, ...init?.headers },
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

async function parseErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      return data?.message || data?.error || `Erro ${response.status}`;
    } catch (_) {
      // ignore
    }
  }
  const text = await response.text();
  return text || `Erro ${response.status}`;
}

export interface BootstrapData {
  clients: Client[];
  cases: Case[];
  fees: Fee[];
  expenses: Expense[];
  settings: SettingsState;
}

let bootstrapCache: BootstrapData | null = null;
let bootstrapPromise: Promise<BootstrapData> | null = null;

export async function fetchBootstrap(options: { force?: boolean } = {}): Promise<BootstrapData> {
  if (bootstrapCache && !options.force) {
    return structuredClone(bootstrapCache);
  }

  if (!bootstrapPromise || options.force) {
    bootstrapPromise = request<BootstrapData>('/api/bootstrap').then(data => {
      bootstrapCache = data;
      bootstrapPromise = null;
      return structuredClone(data);
    });
  }

  return bootstrapPromise;
}

export function invalidateBootstrapCache(): void {
  bootstrapCache = null;
  bootstrapPromise = null;
}

export type Resource = 'clients' | 'cases' | 'financials' | 'settings';

export interface CommandRequest<TPayload = unknown> {
  resource: Resource;
  action: string;
  payload?: TPayload;
}

export async function executeCommand<TResult>(command: CommandRequest): Promise<TResult> {
  const result = await request<TResult>('/api/commands', {
    method: 'POST',
    body: JSON.stringify(command),
  });
  invalidateBootstrapCache();
  return result;
}

export interface UploadDocumentResponse {
  document: CaseDocument;
  case: Case;
}

export async function uploadCaseDocument(caseId: string, file: File): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caseId', caseId);

  const limitMb = Number(import.meta.env.VITE_WORKER_UPLOAD_LIMIT_MB ?? '10');
  if (Number.isFinite(limitMb) && limitMb > 0) {
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > limitMb) {
      throw new Error(`O arquivo excede o limite de ${limitMb} MB.`);
    }
  }

  const result = await request<UploadDocumentResponse>('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  invalidateBootstrapCache();
  return result;
}

export interface DeleteDocumentResponse {
  caseId: string;
  documentId: string;
  case: Case;
}

export async function deleteCaseDocument(caseId: string, documentId: string): Promise<DeleteDocumentResponse> {
  const result = await request<DeleteDocumentResponse>(`/api/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
  invalidateBootstrapCache();
  return result;
}

