
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  sources?: { uri: string; title: string }[];
}

export type CaseStatus = 'Aberto' | 'Em Andamento' | 'Pendente' | 'Fechado' | 'Arquivado' | 'Análise Inicial' | 'Judicial' | 'Administrativo' | 'Concedido' | 'Negado' | 'Em Exigência' | 'Fase Recursal' | 'Finalizado';

export interface Task {
  id: string;
  description: string;
  dueDate: string; // ISO string format 'YYYY-MM-DD'
  completed: boolean;
  caseId: string;
}

export interface SuggestedTask {
  description: string;
  dueDate: string;
  reasoning: string;
}

export interface RepresentativeData {
    name: string;
    motherName: string;
    fatherName: string;
    cpf: string;
    rg: string;
    rgIssuer: string;
    rgIssuerUF: string;
    dataEmissao: string;
    dateOfBirth: string;
    nacionalidade: string;
    naturalidade: string;
    estadoCivil: string;
    profissao: string;
    email: string;
    phone: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
}

export interface Client {
    id: string;
    name: string;
    cpf: string;
    rg: string;
    rgIssuer: string;
    rgIssuerUF: string;
    dataEmissao: string;
    motherName: string;
    fatherName: string;
    dateOfBirth: string;
    nacionalidade: string;
    naturalidade: string;
    estadoCivil: string;
    profissao: string;
    legalRepresentative?: RepresentativeData;
    email: string;
    phone: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    createdAt: string;
}

export interface LegalDocument {
    templateId: string;
    title: string;
    status: 'Pendente' | 'Gerado' | 'Assinado';
}

export type DocumentFileType = 'pdf' | 'doc' | 'docx' | 'jpg' | 'jpeg' | 'png' | 'other';

export interface CaseDocument {
    name: string;
    url: string;
    type: DocumentFileType;
    uploadedAt: string;
}

export interface Case {
  id:string;
  caseNumber: string;
  title: string;
  clientId: string;
  status: CaseStatus;
  nature: 'Judicial' | 'Administrativo';
  benefitType: string;
  startDate: string;
  lastUpdate: string;
  tasks: Task[];
  notes: string;
  aiSummary: string;
  documents: CaseDocument[];
  legalDocuments: LegalDocument[];
}

export enum FeeType {
    INICIAL = 'Inicial',
    MENSAL = 'Mensal',
    EXITO = 'Êxito',
    PARCELADO = 'Parcelado',
    CONSULTA = 'Consulta',
}

export enum FeeStatus {
    PAGO = 'Pago',
    PENDENTE = 'Pendente',
    ATRASADO = 'Atrasado',
    PARCIALMENTE_PAGO = 'Parcialmente Pago',
}

export interface Installment {
    id: string;
    amount: number;
    dueDate: string;
    status: 'Pago' | 'Pendente';
}

export interface Fee {
    id: string;
    caseId: string;
    description: string;
    amount: number;
    dueDate: string;
    type: FeeType;
    status: FeeStatus;
    installments?: Installment[];
}

export interface Expense {
    id: string;
    caseId: string;
    description: string;
    amount: number;
    date: string; // YYYY-MM-DD
}

export interface DocumentTemplate {
    id: string;
    title: string;
    content: string;
    headerImage?: string; // Base64
    footerImage?: string; // Base64
    backgroundImage?: string; // Base64
}

export interface DocumentChecklistConfig {
  [benefitType: string]: string[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  closing?: boolean;
}

export interface FirmInfo {
    name: string;
    oab: string;
    email: string;
    phone: string;
    address: string;
}

export interface BrandingSettings {
    logo: string; // Base64 encoded image
}

export interface NotificationSettings {
    deadlineThresholdDays: number;
}
