
import { Case, Client, Fee, Expense, DocumentTemplate, CaseStatus, FeeType, FeeStatus, DocumentChecklistConfig, FirmInfo, BrandingSettings, NotificationSettings } from '../types';

export const initialBenefitTypes = [
    "Direito Civil",
    "Direito do Consumidor",
    "Direito Trabalhista",
    "Direito de Família",
    "Direito Previdenciário",
    "Direito Tributário",
    "Aposentadoria por Idade",
    "Auxílio-Doença",
    "Outro",
];

export const initialCaseStatuses: CaseStatus[] = ['Aberto', 'Em Andamento', 'Pendente', 'Fechado', 'Arquivado', 'Análise Inicial', 'Judicial', 'Administrativo', 'Concedido', 'Negado', 'Em Exigência', 'Fase Recursal', 'Finalizado'];

export const mockDocumentChecklistConfig: DocumentChecklistConfig = {
    "Direito Civil": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência", "Contratos", "Notificações"],
    "Direito do Consumidor": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência", "Nota Fiscal/Recibo", "Protocolos de Atendimento"],
    "Direito Trabalhista": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência", "Carteira de Trabalho (CTPS)", "Contracheques", "Termo de Rescisão"],
    "Direito de Família": ["Documento de Identificação (RG/CNH)", "CPF", "Certidão de Casamento/Nascimento", "Comprovante de Residência"],
    "Direito Previdenciário": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência", "Carteira de Trabalho (CTPS)", "Extrato CNIS", "Laudos Médicos (se aplicável)"],
    "Direito Tributário": ["Documento de Identificação (RG/CNH)", "CPF", "Contrato Social", "Declarações de Imposto", "Comprovantes de Pagamento de Tributos"],
    "Aposentadoria por Idade": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência", "Carteira de Trabalho (CTPS)", "Extrato CNIS"],
    "Auxílio-Doença": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência", "Laudos Médicos", "Atestados", "Exames"],
    "Outro": ["Documento de Identificação (RG/CNH)", "CPF", "Comprovante de Residência"],
};

export const mockFirmInfo: FirmInfo = {
    name: "Seu Escritório de Advocacia",
    oab: "OAB/UF 123.456",
    email: "contato@seu-escritorio.com",
    phone: "(00) 1234-5678",
    address: "Avenida Principal, 123, Sala 45, Centro, Sua Cidade - UF, 12345-678"
};

export const mockBrandingSettings: BrandingSettings = {
    logo: "" // Default empty logo
};

export const mockNotificationSettings: NotificationSettings = {
    deadlineThresholdDays: 7
};

export const mockClients: Client[] = [
  { 
    id: '1', name: 'João da Silva Pereira', cpf: '111.222.333-44', rg: '12.345.678-9', rgIssuer: 'SSP', rgIssuerUF: 'SP', dataEmissao: '2010-05-20', motherName: 'Maria da Silva', fatherName: 'José Pereira', dateOfBirth: '1960-03-15', nacionalidade: 'Brasileiro', naturalidade: 'São Paulo/SP', estadoCivil: 'Casado', profissao: 'Motorista', email: 'joao.silva@email.com', phone: '(11) 98765-4321', cep: '01001-000', street: 'Praça da Sé', number: '100', complement: 'Apto 10', neighborhood: 'Sé', city: 'São Paulo', state: 'SP', createdAt: '2023-01-15T10:00:00Z',
  },
  { 
    id: '2', name: 'Maria Oliveira Santos', cpf: '222.333.444-55', rg: '23.456.789-0', rgIssuer: 'SSP', rgIssuerUF: 'RJ', dataEmissao: '2012-08-10', motherName: 'Ana Oliveira', fatherName: 'Carlos Santos', dateOfBirth: '1985-11-22', nacionalidade: 'Brasileira', naturalidade: 'Rio de Janeiro/RJ', estadoCivil: 'Solteira', profissao: 'Enfermeira', email: 'maria.oliveira@email.com', phone: '(21) 91234-5678', cep: '20040-002', street: 'Avenida Rio Branco', number: '156', complement: 'Sala 502', neighborhood: 'Centro', city: 'Rio de Janeiro', state: 'RJ', createdAt: '2023-02-20T14:30:00Z',
  },
];

const getFutureDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

export const mockCases: Case[] = [
  { 
    id: '1', 
    caseNumber: '070.2024.12345-6', 
    title: 'Análise de Período Rural', 
    clientId: '1',
    status: 'Análise Inicial', 
    nature: 'Judicial',
    benefitType: 'Aposentadoria por Idade',
    startDate: '2024-07-01',
    lastUpdate: '2024-07-22',
    notes: 'Cliente completou 65 anos. Possui 185 contribuições no CNIS. Necessário verificar períodos de trabalho rural não averbados.',
    aiSummary: '',
    tasks: [
        { id: 't1', caseId: '1', description: 'Analisar extrato CNIS', dueDate: getFutureDate(2), completed: false },
        { id: 't2', caseId: '1', description: 'Agendar entrevista com cliente', dueDate: getFutureDate(5), completed: false },
    ],
    documents: [],
    legalDocuments: [
        { templateId: '1', title: 'Procuração Ad Judicia', status: 'Pendente' },
        { templateId: '2', title: 'Contrato de Honorários', status: 'Pendente' },
    ]
  },
  { 
    id: '2', 
    caseNumber: '080.2024.54321-0', 
    title: 'Recurso Administrativo', 
    clientId: '2',
    status: 'Em Exigência', 
    nature: 'Administrativo',
    benefitType: 'Auxílio-Doença',
    startDate: '2024-06-15',
    lastUpdate: '2024-07-20',
    notes: 'Perícia inicial negou o benefício. INSS emitiu carta de exigência solicitando laudo de especialista em ortopedia.',
    aiSummary: '',
    tasks: [
        { id: 't3', caseId: '2', description: 'Comunicar exigência ao cliente', dueDate: getFutureDate(-1), completed: true },
        { id: 't4', caseId: '2', description: 'Juntar novo laudo médico', dueDate: getFutureDate(10), completed: false },
    ],
    documents: [{name: 'laudo_antigo.pdf', url: '#', type: 'pdf', uploadedAt: '2024-07-18'}],
    legalDocuments: [
        { templateId: '1', title: 'Procuração Ad Judicia', status: 'Assinado' },
        { templateId: '2', title: 'Contrato de Honorários', status: 'Gerado' },
    ]
  },
];

export const mockFees: Fee[] = [
    { id: 'f1', caseId: '1', description: 'Taxa de entrada', amount: 1500, dueDate: '2024-07-10', type: FeeType.INICIAL, status: FeeStatus.PAGO },
    { id: 'f2', caseId: '2', description: 'Honorários de Êxito', amount: 8000, dueDate: '2025-01-15', type: FeeType.EXITO, status: FeeStatus.PENDENTE },
    { 
        id: 'f3', caseId: '1', description: 'Parcelamento Contratual', amount: 3000, dueDate: '2024-12-30', type: FeeType.PARCELADO, status: FeeStatus.PARCIALMENTE_PAGO,
        installments: [
            { id: 'i1', amount: 1000, dueDate: '2024-07-30', status: 'Pago' },
            { id: 'i2', amount: 1000, dueDate: '2024-08-30', status: 'Pendente' },
            { id: 'i3', amount: 1000, dueDate: '2024-09-30', status: 'Pendente' },
        ]
    },
];

export const mockExpenses: Expense[] = [
    { id: 'e1', caseId: '1', description: 'Custas de cópias', amount: 45.50, date: '2024-07-21' },
    { id: 'e2', caseId: '2', description: 'Deslocamento para perícia', amount: 80, date: '2024-07-05' },
];

export const mockDocumentTemplates: DocumentTemplate[] = [
    { id: '1', title: 'Procuração Ad Judicia', content: 'PROCURAÇÃO "AD JUDICIA ET EXTRA"\n\nOUTORGANTE: {{cliente.name}}, nacionalidade {{cliente.nacionalidade}}, profissão {{cliente.profissao}}, estado civil {{cliente.estadoCivil}}, portador(a) do RG nº {{cliente.rg}} e do CPF nº {{cliente.cpf}}, residente e domiciliado(a) na {{cliente.street}}, nº {{cliente.number}}, {{cliente.city}}-{{cliente.state}}.\n\nOUTORGADO: {{escritorio.name}}, OAB/{{escritorio.oab}}...\n\nPODERES:...', headerImage: '', footerImage: '', backgroundImage: '' },
    { id: '2', title: 'Contrato de Honorários', content: 'CONTRATO DE HONORÁRIOS ADVOCATÍCIOS\n\nCONTRATANTE: {{cliente.name}}, CPF nº {{cliente.cpf}}.\n\nCONTRATADO: {{escritorio.name}}...\n\nOBJETO: Atuação no caso de {{caso.benefitType}}, processo nº {{caso.caseNumber}}...\n\nVALOR:...', headerImage: '', footerImage: '', backgroundImage: '' },
    { id: '3', title: 'Declaração de Hipossuficiência', content: 'DECLARAÇÃO DE HIPOSSUFICIÊNCIA\n\nEu, {{cliente.name}}, portador(a) do CPF nº {{cliente.cpf}}, declaro para os devidos fins, sob as penas da lei, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do meu sustento e de minha família...', headerImage: '', footerImage: '', backgroundImage: '' },
];
