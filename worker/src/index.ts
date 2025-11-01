import { neon } from '@neondatabase/serverless';
import {
  mockClients,
  mockCases,
  mockFees,
  mockExpenses,
  mockDocumentTemplates,
  mockDocumentChecklistConfig,
  mockFirmInfo,
  mockBrandingSettings,
  mockNotificationSettings,
  initialBenefitTypes,
  initialCaseStatuses,
} from '../../shared/mockData';
import type {
  Case,
  CaseDocument,
  CaseStatus,
  Client,
  Expense,
  Fee,
  FeeStatus,
  LegalDocument,
  SettingsState,
  Task,
} from '../../types';

interface FinancialState {
  fees: Fee[];
  expenses: Expense[];
}

interface AppState {
  clients: Client[];
  cases: Case[];
  financials: FinancialState;
  settings: SettingsState;
}

type Scope = keyof AppState;

type Resource = 'clients' | 'cases' | 'financials' | 'settings';

type DocumentFileType = CaseDocument['type'];

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface CommandRequest<TPayload = unknown> {
  resource: Resource;
  action: string;
  payload?: TPayload;
}

interface FinancialSnapshot {
  fees: Fee[];
  expenses: Expense[];
}

export interface Env {
  NEON_DATABASE_URL: string;
  FILES_BUCKET: R2Bucket;
  R2_PUBLIC_BASE_URL?: string;
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  GOOGLE_AI_API_KEY?: string;
  GOOGLE_AI_MODEL?: string;
}

const DEFAULT_STATE: AppState = createDefaultState();

let initializationPromise: Promise<void> | null = null;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    if (!url.pathname.startsWith('/api')) {
      return withCors(request, new Response('Not found', { status: 404 }));
    }

    try {
      await ensureState(env);

      if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
        return withCors(request, jsonResponse(await handleBootstrap(env)));
      }

      if (request.method === 'POST' && url.pathname === '/api/commands') {
        const command = (await request.json()) as CommandRequest;
        const result = await handleCommand(env, command);
        return withCors(request, jsonResponse(result ?? {}));
      }

      if (request.method === 'POST' && url.pathname === '/api/documents/upload') {
        return withCors(request, await handleUploadDocument(request, env));
      }

      const documentDeleteMatch = url.pathname.match(/^\/api\/cases\/(.+?)\/documents\/(.+)$/);
      if (documentDeleteMatch && request.method === 'DELETE') {
        const [, caseId, documentId] = documentDeleteMatch;
        return withCors(
          request,
          jsonResponse(await handleDeleteDocument(env, decodeURIComponent(caseId), decodeURIComponent(documentId))),
        );
      }

      const documentDownloadMatch = url.pathname.match(/^\/api\/documents\/(.+?)\/(.+)$/);
      if (documentDownloadMatch && request.method === 'GET') {
        const [, caseId, documentId] = documentDownloadMatch;
        return withCors(
          request,
          await handleDownloadDocument(env, decodeURIComponent(caseId), decodeURIComponent(documentId)),
        );
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/ai/')) {
        return withCors(
          request,
          jsonResponse(await handleAiRequest(env, url.pathname.replace('/api/ai', ''), await request.json())),
        );
      }

      return withCors(request, jsonResponse({ message: 'Rota não encontrada.' }, { status: 404 }));
    } catch (error) {
      console.error('Erro no Worker', error);
      const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
      const status = error instanceof ResponseError ? error.status : 500;
      return withCors(request, jsonResponse({ message }, { status }));
    }
  },
};

class ResponseError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function ensureState(env: Env): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const sql = neon(env.NEON_DATABASE_URL);
      await sql`CREATE TABLE IF NOT EXISTS app_state (
        scope TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;

      await Promise.all(
        (Object.keys(DEFAULT_STATE) as Scope[]).map(async scope => {
          await sql`INSERT INTO app_state (scope, payload) VALUES (${scope}, ${JSON.stringify(DEFAULT_STATE[scope])}::jsonb)
            ON CONFLICT (scope) DO NOTHING`;
        }),
      );
    })();
  }

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

async function handleBootstrap(env: Env) {
  const [clients, cases, financials, settings] = await Promise.all([
    readState(env, 'clients'),
    readState(env, 'cases'),
    readState(env, 'financials'),
    readState(env, 'settings'),
  ]);

  return {
    clients,
    cases,
    fees: financials.fees,
    expenses: financials.expenses,
    settings,
  };
}

async function handleCommand(env: Env, command: CommandRequest): Promise<unknown> {
  const { resource, action, payload } = command;

  switch (resource) {
    case 'clients':
      return handleClientsCommand(env, action, payload as Record<string, unknown>);
    case 'cases':
      return handleCasesCommand(env, action, payload as Record<string, unknown>);
    case 'financials':
      return handleFinancialsCommand(env, action, payload as Record<string, unknown>);
    case 'settings':
      return handleSettingsCommand(env, action, payload as Record<string, unknown>);
    default:
      throw new ResponseError('Recurso desconhecido.', 400);
  }
}

async function handleClientsCommand(env: Env, action: string, payload: Record<string, unknown>) {
  const clients = await readState(env, 'clients');

  switch (action) {
    case 'create': {
      const clientData = payload as Partial<Client>;
      const newClient: Client = {
        ...(clientData as Client),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await writeState(env, 'clients', [...clients, newClient]);
      return newClient;
    }
    case 'update': {
      const clientData = payload as Client;
      const index = clients.findIndex(c => c.id === clientData.id);
      if (index === -1) {
        throw new ResponseError('Cliente não encontrado.', 404);
      }
      const updatedClients = [...clients];
      updatedClients[index] = clientData;
      await writeState(env, 'clients', updatedClients);
      return clientData;
    }
    case 'delete': {
      const clientId = String(payload?.clientId ?? '');
      if (!clientId) {
        throw new ResponseError('ID do cliente não informado.', 400);
      }

      const updatedClients = clients.filter(client => client.id !== clientId);
      const cases = await readState(env, 'cases');
      const financials = await readState(env, 'financials');

      const remainingCases = cases.filter(caseItem => caseItem.clientId !== clientId);
      const removedCaseIds = cases.filter(caseItem => caseItem.clientId === clientId).map(caseItem => caseItem.id);
      const remainingFees = financials.fees.filter(fee => !removedCaseIds.includes(fee.caseId));
      const remainingExpenses = financials.expenses.filter(expense => !removedCaseIds.includes(expense.caseId));

      await Promise.all([
        writeState(env, 'clients', updatedClients),
        writeState(env, 'cases', remainingCases),
        writeState(env, 'financials', { fees: remainingFees, expenses: remainingExpenses }),
      ]);

      return {
        clients: updatedClients,
        cases: remainingCases,
        fees: remainingFees,
        expenses: remainingExpenses,
        removedCaseIds,
      };
    }
    case 'reset': {
      const defaults = clone(DEFAULT_STATE.clients);
      await writeState(env, 'clients', defaults);
      return defaults;
    }
    default:
      throw new ResponseError('Ação desconhecida para clientes.', 400);
  }
}

async function handleCasesCommand(env: Env, action: string, payload: Record<string, unknown>) {
  const cases = await readState(env, 'cases');
  const financials = await readState(env, 'financials');

  switch (action) {
    case 'createCase': {
      const caseData = payload as Partial<Case>;
      const settings = await readState(env, 'settings');
      const now = formatDate();
      const newCase: Case = {
        ...(caseData as Case),
        id: crypto.randomUUID(),
        tasks: [],
        aiSummary: '',
        documents: [],
        startDate: now,
        lastUpdate: now,
        legalDocuments:
          (caseData.legalDocuments as LegalDocument[] | undefined) ??
          settings.documentTemplates.map(template => ({
            templateId: template.id,
            title: template.title,
            status: 'Pendente',
          })),
      };
      await writeState(env, 'cases', [...cases, newCase]);
      return newCase;
    }
    case 'updateCase': {
      const caseData = payload as Case;
      const index = cases.findIndex(caseItem => caseItem.id === caseData.id);
      if (index === -1) {
        throw new ResponseError('Caso não encontrado.', 404);
      }
      const updatedCase: Case = {
        ...cases[index],
        ...caseData,
        lastUpdate: formatDate(),
      };
      const updatedCases = [...cases];
      updatedCases[index] = updatedCase;
      await writeState(env, 'cases', updatedCases);
      return updatedCase;
    }
    case 'addTask': {
      const caseId = String(payload?.caseId ?? '');
      const taskData = (payload?.task ?? {}) as Partial<Task>;
      const targetCase = cases.find(caseItem => caseItem.id === caseId);
      if (!targetCase) {
        throw new ResponseError('Caso não encontrado.', 404);
      }
      const newTask: Task = {
        ...(taskData as Task),
        id: crypto.randomUUID(),
        caseId,
        description: taskData.description ?? 'Tarefa',
        dueDate: taskData.dueDate ?? formatDate(),
        completed: Boolean(taskData.completed ?? false),
      };
      const updatedCase: Case = {
        ...targetCase,
        tasks: [...targetCase.tasks, newTask],
        lastUpdate: formatDate(),
      };
      await writeState(env, 'cases', cases.map(caseItem => (caseItem.id === caseId ? updatedCase : caseItem)));
      return updatedCase;
    }
    case 'updateTask': {
      const taskData = payload?.task as Task | undefined;
      if (!taskData) {
        throw new ResponseError('Dados da tarefa não informados.', 400);
      }
      const targetCase = cases.find(caseItem => caseItem.id === taskData.caseId);
      if (!targetCase) {
        throw new ResponseError('Caso não encontrado.', 404);
      }
      const updatedCase: Case = {
        ...targetCase,
        tasks: targetCase.tasks.map(task => (task.id === taskData.id ? taskData : task)),
        lastUpdate: formatDate(),
      };
      await writeState(env, 'cases', cases.map(caseItem => (caseItem.id === taskData.caseId ? updatedCase : caseItem)));
      return updatedCase;
    }
    case 'updateLegalDocumentStatus': {
      const caseId = String(payload?.caseId ?? '');
      const templateId = String(payload?.templateId ?? '');
      const status = payload?.status as LegalDocument['status'];
      const targetCase = cases.find(caseItem => caseItem.id === caseId);
      if (!targetCase) {
        throw new ResponseError('Caso não encontrado.', 404);
      }
      const updatedCase: Case = {
        ...targetCase,
        legalDocuments: targetCase.legalDocuments.map(doc =>
          doc.templateId === templateId ? { ...doc, status } : doc,
        ),
        lastUpdate: formatDate(),
      };
      await writeState(env, 'cases', cases.map(caseItem => (caseItem.id === caseId ? updatedCase : caseItem)));
      return updatedCase;
    }
    case 'removeByClient': {
      const clientId = String(payload?.clientId ?? '');
      if (!clientId) {
        throw new ResponseError('ID do cliente não informado.', 400);
      }
      const remainingCases = cases.filter(caseItem => caseItem.clientId !== clientId);
      const removedCaseIds = cases.filter(caseItem => caseItem.clientId === clientId).map(caseItem => caseItem.id);
      if (removedCaseIds.length > 0) {
        const remainingFees = financials.fees.filter(fee => !removedCaseIds.includes(fee.caseId));
        const remainingExpenses = financials.expenses.filter(expense => !removedCaseIds.includes(expense.caseId));
        await Promise.all([
          writeState(env, 'cases', remainingCases),
          writeState(env, 'financials', { fees: remainingFees, expenses: remainingExpenses }),
        ]);
      } else {
        await writeState(env, 'cases', remainingCases);
      }
      return { removedCaseIds, cases: remainingCases };
    }
    case 'reset': {
      const defaults = clone(DEFAULT_STATE.cases);
      await writeState(env, 'cases', defaults);
      return defaults;
    }
    default:
      throw new ResponseError('Ação desconhecida para casos.', 400);
  }
}

async function handleFinancialsCommand(env: Env, action: string, payload: Record<string, unknown>) {
  const financials = await readState(env, 'financials');

  const applyAndPersist = async (snapshot: FinancialSnapshot) => {
    await writeState(env, 'financials', snapshot);
    return snapshot;
  };

  switch (action) {
    case 'addFee': {
      const feeData = payload as Omit<Fee, 'id'>;
      const newFee: Fee = { ...feeData, id: crypto.randomUUID() } as Fee;
      return applyAndPersist({ fees: [...financials.fees, newFee], expenses: financials.expenses });
    }
    case 'updateFee': {
      const feeData = payload as Fee;
      return applyAndPersist({
        fees: financials.fees.map(fee => (fee.id === feeData.id ? feeData : fee)),
        expenses: financials.expenses,
      });
    }
    case 'deleteFee': {
      const feeId = String(payload?.feeId ?? '');
      return applyAndPersist({
        fees: financials.fees.filter(fee => fee.id !== feeId),
        expenses: financials.expenses,
      });
    }
    case 'addExpense': {
      const expenseData = payload as Omit<Expense, 'id'>;
      const newExpense: Expense = { ...expenseData, id: crypto.randomUUID() } as Expense;
      return applyAndPersist({ fees: financials.fees, expenses: [...financials.expenses, newExpense] });
    }
    case 'updateExpense': {
      const expenseData = payload as Expense;
      return applyAndPersist({
        fees: financials.fees,
        expenses: financials.expenses.map(expense => (expense.id === expenseData.id ? expenseData : expense)),
      });
    }
    case 'deleteExpense': {
      const expenseId = String(payload?.expenseId ?? '');
      return applyAndPersist({
        fees: financials.fees,
        expenses: financials.expenses.filter(expense => expense.id !== expenseId),
      });
    }
    case 'updateInstallmentStatus': {
      const feeId = String(payload?.feeId ?? '');
      const installmentId = String(payload?.installmentId ?? '');
      const status = String(payload?.status ?? '');
      const updatedFees = financials.fees.map(fee => {
        if (fee.id !== feeId || !fee.installments) {
          return fee;
        }
        const installments = fee.installments.map(inst =>
          inst.id === installmentId ? { ...inst, status: status === 'Pago' ? 'Pago' : 'Pendente' } : inst,
        );
        const paidCount = installments.filter(inst => inst.status === 'Pago').length;
        let nextStatus: FeeStatus = fee.status;
        if (paidCount === installments.length) {
          nextStatus = FeeStatus.PAGO;
        } else if (paidCount === 0) {
          nextStatus = FeeStatus.PENDENTE;
        } else {
          nextStatus = FeeStatus.PARCIALMENTE_PAGO;
        }
        return { ...fee, installments, status: nextStatus };
      });
      return applyAndPersist({ fees: updatedFees, expenses: financials.expenses });
    }
    case 'removeByCaseIds': {
      const caseIds = Array.isArray(payload?.caseIds) ? (payload?.caseIds as string[]) : [];
      if (caseIds.length === 0) {
        return financials;
      }
      return applyAndPersist({
        fees: financials.fees.filter(fee => !caseIds.includes(fee.caseId)),
        expenses: financials.expenses.filter(expense => !caseIds.includes(expense.caseId)),
      });
    }
    case 'reset': {
      const defaults = clone(DEFAULT_STATE.financials);
      await writeState(env, 'financials', defaults);
      return defaults;
    }
    default:
      throw new ResponseError('Ação desconhecida para dados financeiros.', 400);
  }
}

async function handleSettingsCommand(env: Env, action: string, payload: Record<string, unknown>) {
  const settings = await readState(env, 'settings');
  const next = clone(settings);

  const persist = async () => {
    await writeState(env, 'settings', next);
    return next;
  };

  switch (action) {
    case 'addTemplate': {
      const template = payload as Omit<any, 'id'>;
      next.documentTemplates.push({ ...template, id: crypto.randomUUID() });
      return persist();
    }
    case 'updateTemplate': {
      const template = payload as any;
      next.documentTemplates = next.documentTemplates.map(item => (item.id === template.id ? template : item));
      return persist();
    }
    case 'deleteTemplate': {
      const templateId = String(payload?.templateId ?? '');
      next.documentTemplates = next.documentTemplates.filter(item => item.id !== templateId);
      return persist();
    }
    case 'addBenefitType': {
      const value = String(payload?.value ?? '').trim();
      if (value && !next.benefitTypes.includes(value)) {
        next.benefitTypes.push(value);
      }
      return persist();
    }
    case 'removeBenefitType': {
      const value = String(payload?.value ?? '').trim();
      next.benefitTypes = next.benefitTypes.filter(item => item !== value);
      return persist();
    }
    case 'addCaseStatus': {
      const value = String(payload?.value ?? '').trim() as CaseStatus;
      if (value && !next.caseStatuses.includes(value)) {
        next.caseStatuses.push(value);
      }
      return persist();
    }
    case 'removeCaseStatus': {
      const value = String(payload?.value ?? '').trim();
      next.caseStatuses = next.caseStatuses.filter(item => item !== value);
      return persist();
    }
    case 'updateChecklistItem': {
      const benefitType = String(payload?.benefitType ?? '');
      const item = String(payload?.item ?? '');
      const actionType = String(payload?.action ?? 'add');
      const current = next.documentChecklistConfig[benefitType] ?? [];
      if (actionType === 'add') {
        if (!current.includes(item)) {
          next.documentChecklistConfig[benefitType] = [...current, item];
        }
      } else {
        next.documentChecklistConfig[benefitType] = current.filter(existing => existing !== item);
      }
      return persist();
    }
    case 'updateFirmInfo': {
      next.firmInfo = payload as typeof next.firmInfo;
      return persist();
    }
    case 'updateBrandingSettings': {
      next.brandingSettings = payload as typeof next.brandingSettings;
      return persist();
    }
    case 'updateNotificationSettings': {
      next.notificationSettings = payload as typeof next.notificationSettings;
      return persist();
    }
    case 'reset': {
      const defaults = clone(DEFAULT_STATE.settings);
      await writeState(env, 'settings', defaults);
      return defaults;
    }
    default:
      throw new ResponseError('Ação desconhecida para configurações.', 400);
  }
}

async function handleUploadDocument(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const caseId = String(formData.get('caseId') ?? '');
  const file = formData.get('file');

  if (!caseId || !(file instanceof File)) {
    throw new ResponseError('Parâmetros de upload inválidos.', 400);
  }

  const cases = await readState(env, 'cases');
  const targetCase = cases.find(caseItem => caseItem.id === caseId);
  if (!targetCase) {
    throw new ResponseError('Caso não encontrado.', 404);
  }

  const documentId = crypto.randomUUID();
  const sanitizedName = file.name.replace(/\s+/g, '_');
  const storageKey = `cases/${caseId}/${documentId}-${sanitizedName}`;

  await env.FILES_BUCKET.put(storageKey, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
    },
  });

  const publicBase = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  const documentUrl = publicBase ? `${publicBase}/${storageKey}` : `/api/documents/${encodeURIComponent(caseId)}/${encodeURIComponent(documentId)}`;

  const newDocument: CaseDocument = {
    id: documentId,
    name: file.name,
    url: documentUrl,
    type: getFileType(file.name),
    uploadedAt: formatDate(),
    storageKey,
    size: file.size,
  };

  const updatedCase: Case = {
    ...targetCase,
    documents: [...targetCase.documents, newDocument],
    lastUpdate: formatDate(),
  };

  await writeState(env, 'cases', cases.map(caseItem => (caseItem.id === caseId ? updatedCase : caseItem)));

  return jsonResponse({ document: newDocument, case: updatedCase });
}

async function handleDeleteDocument(env: Env, caseId: string, documentId: string) {
  const cases = await readState(env, 'cases');
  const targetCase = cases.find(caseItem => caseItem.id === caseId);
  if (!targetCase) {
    throw new ResponseError('Caso não encontrado.', 404);
  }
  const document = targetCase.documents.find(doc => doc.id === documentId);
  if (!document) {
    throw new ResponseError('Documento não encontrado.', 404);
  }

  if (document.storageKey) {
    await env.FILES_BUCKET.delete(document.storageKey);
  }

  const updatedCase: Case = {
    ...targetCase,
    documents: targetCase.documents.filter(doc => doc.id !== documentId),
    lastUpdate: formatDate(),
  };

  await writeState(env, 'cases', cases.map(caseItem => (caseItem.id === caseId ? updatedCase : caseItem)));

  return { caseId, documentId, case: updatedCase };
}

async function handleDownloadDocument(env: Env, caseId: string, documentId: string): Promise<Response> {
  const cases = await readState(env, 'cases');
  const targetCase = cases.find(caseItem => caseItem.id === caseId);
  if (!targetCase) {
    return new Response('Caso não encontrado.', { status: 404 });
  }
  const document = targetCase.documents.find(doc => doc.id === documentId);
  if (!document || !document.storageKey) {
    return new Response('Documento não encontrado.', { status: 404 });
  }

  const object = await env.FILES_BUCKET.get(document.storageKey);
  if (!object) {
    return new Response('Arquivo não encontrado.', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'content-disposition': `inline; filename="${document.name.replace(/"/g, '')}"`,
    },
  });
}

async function handleAiRequest(env: Env, path: string, payload: any) {
  switch (path) {
    case '/chat':
      return {
        text: await callAi(env, String(payload?.prompt ?? '')),
        sources: [],
      };
    case '/case-summary': {
      const caseData = payload?.case as Case | undefined;
      const client = payload?.client as Client | undefined;
      if (!caseData || !client) {
        throw new ResponseError('Dados insuficientes para gerar o resumo.', 400);
      }
      const prompt = `Gere um resumo detalhado do caso a seguir em português:
Cliente: ${client.name} (${client.cpf})
Benefício: ${caseData.benefitType}
Situação atual: ${caseData.status}
Notas: ${caseData.notes}`;
      const text = await callAi(env, prompt);
      return { summary: text };
    }
    case '/suggest-tasks': {
      const notes = String(payload?.notes ?? '');
      const prompt = `Analise as notas a seguir e retorne uma lista em JSON com tarefas (campos description, dueDate e reasoning) relacionadas ao processo jurídico. Responda apenas com JSON.
Notas: ${notes}`;
      const response = await callAi(env, prompt, 'json');
      return { tasks: response };
    }
    case '/client-info/from-document': {
      const text = String(payload?.text ?? '');
      const documentType = String(payload?.documentType ?? 'documento');
      const prompt = `Extraia os dados do cliente a partir do texto abaixo do tipo ${documentType} e retorne um JSON com os campos conhecidos (nome completo, CPF, RG, órgãos emissores, endereço completo, dados de contato). Se uma informação não existir, use null.

Texto:
${text}`;
      const response = await callAi(env, prompt, 'json');
      return { json: response };
    }
    case '/client-info/from-image': {
      const base64Image = String(payload?.base64Image ?? '');
      const mimeType = String(payload?.mimeType ?? 'image/png');
      const documentType = String(payload?.documentType ?? 'documento');
      const prompt = `Um documento do tipo ${documentType} foi convertido para base64 com MIME ${mimeType}. Extraia informações relevantes do cliente (nome, CPF, RG, endereço, contatos) e retorne em JSON. Base64: ${base64Image.substring(0, 2000)}`;
      const response = await callAi(env, prompt, 'json');
      return { json: response };
    }
    case '/classify-document': {
      const content = String(payload?.documentContent ?? '');
      const checklist = Array.isArray(payload?.checklist) ? (payload.checklist as string[]) : [];
      const categories = checklist.length > 0 ? checklist.join(', ') : 'Outro';
      const prompt = `Classifique o documento abaixo em uma das categorias: ${categories}. Responda apenas com o nome da categoria.

Conteúdo:
${content}`;
      const result = await callAi(env, prompt, 'text');
      return { classification: result.trim() };
    }
    default:
      throw new ResponseError('Rota de IA desconhecida.', 404);
  }
}

async function callAi(env: Env, prompt: string, responseFormat: 'text' | 'json' = 'text'): Promise<string> {
  const provider = (env.AI_PROVIDER ?? 'openai').toLowerCase();
  if (provider === 'google') {
    return callGoogleAi(env, prompt, responseFormat);
  }
  return callOpenAi(env, prompt, responseFormat);
}

async function callOpenAi(env: Env, prompt: string, responseFormat: 'text' | 'json'): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ResponseError('OPENAI_API_KEY não configurado.', 500);
  }
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const body: Record<string, JsonValue> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  };
  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new ResponseError(`OpenAI: ${message || response.statusText}`, response.status);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGoogleAi(env: Env, prompt: string, responseFormat: 'text' | 'json'): Promise<string> {
  const apiKey = env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new ResponseError('GOOGLE_AI_API_KEY não configurado.', 500);
  }
  const model = env.GOOGLE_AI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: Record<string, JsonValue> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };
  if (responseFormat === 'json') {
    (body.generationConfig as Record<string, JsonValue>).responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new ResponseError(`Google AI: ${message || response.statusText}`, response.status);
  }
  const data = await response.json();
  const candidates = data.candidates ?? [];
  const text = candidates[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

async function readState<T extends Scope>(env: Env, scope: T): Promise<AppState[T]> {
  const sql = neon(env.NEON_DATABASE_URL);
  const rows = await sql`SELECT payload FROM app_state WHERE scope = ${scope}`;
  if (rows.length === 0) {
    const defaultValue = clone(DEFAULT_STATE[scope]);
    await writeState(env, scope, defaultValue);
    return defaultValue;
  }
  return rows[0].payload as AppState[T];
}

async function writeState<T extends Scope>(env: Env, scope: T, payload: AppState[T]): Promise<void> {
  const sql = neon(env.NEON_DATABASE_URL);
  await sql`INSERT INTO app_state (scope, payload, updated_at)
    VALUES (${scope}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (scope) DO UPDATE SET payload = ${JSON.stringify(payload)}::jsonb, updated_at = NOW()`;
}

function handleOptions(request: Request): Response {
  const { value: allowOrigin, allowCredentials } = resolveAllowedOrigin(request.headers.get('Origin'));
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
  if (requestedHeaders) {
    headers.set('Access-Control-Allow-Headers', requestedHeaders);
    headers.append('Vary', 'Access-Control-Request-Headers');
  } else {
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  headers.set('Access-Control-Max-Age', '86400');
  headers.append('Vary', 'Origin');
  return new Response(null, { status: 204, headers });
}

function withCors(request: Request, response: Response): Response {
  const { value: allowOrigin, allowCredentials } = resolveAllowedOrigin(request.headers.get('Origin'));
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  if (allowCredentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.append('Vary', 'Origin');
  return response;
}

function resolveAllowedOrigin(originHeader: string | null): { value: string; allowCredentials: boolean } {
  if (!originHeader || originHeader === 'null') {
    return { value: '*', allowCredentials: false };
  }
  return { value: originHeader, allowCredentials: true };
}

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

function formatDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getFileType(fileName: string): DocumentFileType {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
      return 'doc';
    case 'docx':
      return 'docx';
    case 'jpg':
      return 'jpg';
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    default:
      return 'other';
  }
}

function clone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

function createDefaultState(): AppState {
  return {
    clients: clone(mockClients),
    cases: clone(mockCases),
    financials: {
      fees: clone(mockFees),
      expenses: clone(mockExpenses),
    },
    settings: {
      documentTemplates: clone(mockDocumentTemplates),
      benefitTypes: clone(initialBenefitTypes),
      caseStatuses: clone(initialCaseStatuses),
      documentChecklistConfig: clone(mockDocumentChecklistConfig),
      firmInfo: clone(mockFirmInfo),
      brandingSettings: clone(mockBrandingSettings),
      notificationSettings: clone(mockNotificationSettings),
    },
  };
}
