import React, { useState, useEffect, useRef } from 'react';
import { Client, RepresentativeData, Case, CaseStatus } from '../../types';
import { X, Bot, Loader2, FileText, AlertTriangle, User, FileBadge, MapPin, Shield, Briefcase, ArrowRight, Car, Fingerprint, Globe, FilePlus, Info } from 'lucide-react';
import { extractClientInfoFromDocument, extractClientInfoFromImage, isGeminiAvailable } from '../../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '../../context/ToastContext';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
import FormField from './FormField';
import { useSettings } from '../../context/SettingsContext';
import { useClients } from '../../context/ClientsContext';
import { useCases } from '../../context/CasesContext';
import { maskPhone, maskCpf, maskCep } from '../../utils/masks';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, 'id' | 'createdAt'> | Client) => Promise<void> | void;
  initialData: Client | null;
}

type Step = 'clientDetails' | 'caseDetails';
type Tab = 'contact' | 'personal' | 'address' | 'representative';

const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isDisabled?: boolean;
}> = ({ icon, label, isActive, onClick, isDisabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
      isActive
        ? 'border-sky-500 text-sky-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    } ${
      isDisabled
        ? 'cursor-not-allowed text-slate-400 hover:border-transparent'
        : ''
    }`}
    role="tab"
    aria-selected={isActive}
    aria-disabled={isDisabled}
  >
    {icon}
    {label}
  </button>
);

const emptyRepresentative: RepresentativeData = { name: '', motherName: '', fatherName: '', cpf: '', rg: '', rgIssuer: '', rgIssuerUF: '', dataEmissao: '', dateOfBirth: '', nacionalidade: '', naturalidade: '', estadoCivil: '', profissao: '', email: '', phone: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
const initialClientFormData: Omit<Client, 'id' | 'createdAt'> = { name: '', cpf: '', rg: '', rgIssuer: '', rgIssuerUF: '', dataEmissao: '', motherName: '', fatherName: '', dateOfBirth: '', nacionalidade: '', naturalidade: '', estadoCivil: '', profissao: '', legalRepresentative: emptyRepresentative, email: '', phone: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', createdAt: '' };

const docTypes = [
  { name: 'CNH', icon: <Car size={24} /> },
  { name: 'RG', icon: <Fingerprint size={24} /> },
  { name: 'CTPS', icon: <Briefcase size={24} /> },
  { name: 'Passaporte', icon: <Globe size={24} /> },
  { name: 'Certidão', icon: <FileText size={24} /> },
  { name: 'Outro', icon: <FilePlus size={24} /> },
];

const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { benefitTypes, caseStatuses } = useSettings();
  const { addClient } = useClients();
  const { saveCase } = useCases();
  const { addToast } = useToast();
  const isAIAvailable = isGeminiAvailable;

  const [step, setStep] = useState<Step>('clientDetails');
  const [newlyCreatedClient, setNewlyCreatedClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState(initialClientFormData);
  const [caseFormData, setCaseFormData] = useState({
    title: '',
    caseNumber: '',
    status: caseStatuses[0],
    nature: 'Administrativo' as 'Judicial' | 'Administrativo',
    benefitType: benefitTypes[0] || '',
    notes: ''
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRepUpload, setIsRepUpload] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isRepCepLoading, setIsRepCepLoading] = useState(false);
  const [isUnderage, setIsUnderage] = useState(false);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState<Tab>('contact');
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  const resetForms = () => {
    setFormData(initialClientFormData);
    setCaseFormData({
        title: '',
        caseNumber: '',
        status: caseStatuses[0],
        nature: 'Administrativo',
        benefitType: benefitTypes[0] || '',
        notes: ''
    });
    setError('');
    setCurrentTab('contact');
    setStep('clientDetails');
    setAiFilledFields(new Set());
    setNewlyCreatedClient(null);
  };

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            const data = { ...initialClientFormData, ...initialData };
            data.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth + 'T00:00:00').toISOString().split('T')[0] : '';
            data.dataEmissao = data.dataEmissao ? new Date(data.dataEmissao + 'T00:00:00').toISOString().split('T')[0] : '';
            if (data.legalRepresentative) {
                data.legalRepresentative.dateOfBirth = data.legalRepresentative.dateOfBirth ? new Date(data.legalRepresentative.dateOfBirth + 'T00:00:00').toISOString().split('T')[0] : '';
                data.legalRepresentative.dataEmissao = data.legalRepresentative.dataEmissao ? new Date(data.legalRepresentative.dataEmissao + 'T00:00:00').toISOString().split('T')[0] : '';
            } else {
                data.legalRepresentative = emptyRepresentative;
            }
            setFormData(data);
        } else {
            resetForms();
        }
    }
  }, [initialData, isOpen, benefitTypes, caseStatuses]);

  useEffect(() => {
    if (formData.dateOfBirth) {
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        const underage = age < 18;
        setIsUnderage(underage);
        if (!underage) {
            setFormData(prev => ({ ...prev, legalRepresentative: emptyRepresentative }));
        }
    } else {
        setIsUnderage(false);
    }
  }, [formData.dateOfBirth]);

  const processFileWithAI = async (fileToProcess: File, isRep: boolean, documentType: string) => {
    if (!fileToProcess) return;

    if (!isAIAvailable) {
      const message = 'Preenchimento automático indisponível. Configure a URL do proxy VITE_AI_PROXY_URL para ativar a análise por IA.';
      setError(message);
      addToast(message, 'warning');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          if (!event.target?.result) throw new Error("Falha ao ler o arquivo.");
          let jsonString;
          if (fileToProcess.type.startsWith('image/')) {
            const base64String = (event.target.result as string).split(',')[1];
            jsonString = await extractClientInfoFromImage(base64String, fileToProcess.type, documentType);
          } else if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument({ data: event.target.result as ArrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
            }

            if (fullText.trim().length < 100) { // Heuristic: if text is too short, it might be an image-only PDF
                const page = await pdf.getPage(1); // Use first page for image conversion
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if(context){
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    jsonString = await extractClientInfoFromImage(canvas.toDataURL('image/jpeg').split(',')[1], 'image/jpeg', documentType);
                } else { throw new Error("Não foi possível renderizar o PDF para análise."); }
            } else {
                jsonString = await extractClientInfoFromDocument(fullText, documentType);
            }
          } else { throw new Error("Formato de arquivo não suportado."); }
          
          const extractedData = JSON.parse(jsonString);
          addToast('Dados extraídos com sucesso!', 'success');
          
          const newAiFilledFields = new Set(aiFilledFields);
          
          if (isRep) {
            Object.keys(extractedData).forEach(key => newAiFilledFields.add(`rep_${key}`));
            setFormData(prev => ({ ...prev, legalRepresentative: { ...prev.legalRepresentative!, ...extractedData } }));
          } else {
            Object.keys(extractedData).forEach(key => newAiFilledFields.add(key));
            setFormData(prev => ({ ...prev, ...extractedData }));
            setCurrentTab('personal');
          }
          setAiFilledFields(newAiFilledFields);

        } catch (e: any) {
          const errorMessage = e.message || 'Falha ao analisar o documento.';
          setError(errorMessage);
          addToast(errorMessage, 'error');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.onerror = () => setError("Erro ao ler o arquivo.");
      if (fileToProcess.type.startsWith('image/')) reader.readAsDataURL(fileToProcess);
      else if (fileToProcess.type === 'application/pdf') reader.readAsArrayBuffer(fileToProcess);
    } catch (e: any) {
      setError(e.message);
      setIsAnalyzing(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        processFileWithAI(file, isRepUpload, selectedDocType);
    }
    if (e.target) e.target.value = '';
  };

  const handleDocTypeClick = (docType: string, isRep: boolean) => {
    if (!isAIAvailable) {
        const message = 'Recurso de leitura automática desativado. Configure a URL do proxy VITE_AI_PROXY_URL para utilizar esta funcionalidade.';
        setError(message);
        addToast(message, 'warning');
        return;
    }
    setSelectedDocType(docType);
    setIsRepUpload(isRep);
    fileInputRef.current?.click();
  };

  const handleCepChange = async (cepValue: string) => {
    const maskedCep = maskCep(cepValue);
    setFormData(prev => ({ ...prev, cep: maskedCep }));

    const unmaskedCep = maskedCep.replace(/\D/g, '');
    if (unmaskedCep.length !== 8) return;

    setIsCepLoading(true);
    setError('');
    try {
        const response = await fetch(`https://viacep.com.br/ws/${unmaskedCep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado.');
        const data = await response.json();
        if (data.erro) throw new Error('CEP inválido ou não encontrado.');
        setFormData(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf, complement: data.complemento || prev.complement }));
    } catch (err: any) {
        const errorMessage = err.message || 'Erro ao buscar CEP.';
        setError(errorMessage);
        addToast(errorMessage, 'error');
        setFormData(prev => ({ ...prev, street: '', neighborhood: '', city: '', state: '' }));
    } finally {
        setIsCepLoading(false);
    }
  };

  const handleRepCepChange = async (cepValue: string) => {
    const maskedCep = maskCep(cepValue);
    setFormData(prev => ({ ...prev, legalRepresentative: { ...prev.legalRepresentative!, cep: maskedCep } }));

    const unmaskedCep = maskedCep.replace(/\D/g, '');
    if (unmaskedCep.length !== 8) return;

    setIsRepCepLoading(true);
    setError('');
    try {
        const response = await fetch(`https://viacep.com.br/ws/${unmaskedCep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado.');
        const data = await response.json();
        if (data.erro) throw new Error('CEP inválido ou não encontrado.');
        setFormData(prev => ({ ...prev, legalRepresentative: { ...prev.legalRepresentative!, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf, complement: data.complemento || prev.legalRepresentative!.complement } }));
    } catch (err: any) {
        const errorMessage = err.message || 'Erro ao buscar CEP.';
        setError(errorMessage);
        addToast(errorMessage, 'error');
        setFormData(prev => ({ ...prev, legalRepresentative: { ...prev.legalRepresentative!, street: '', neighborhood: '', city: '', state: '' } }));
    } finally {
        setIsRepCepLoading(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      await onSave(initialData ? { ...initialData, ...formData } : formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cliente pelo modal.', error);
    }
  };

  const handleSaveAndCreateCase = async () => {
    try {
      const savedClient = await addClient(formData);
      setNewlyCreatedClient(savedClient);
      setStep('caseDetails');
      addToast(`Cliente ${savedClient.name} salvo. Agora, crie o primeiro caso.`, 'success');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível salvar o cliente. Tente novamente.'), 'error');
    }
  };

  const handleSaveCase = async () => {
    if (!newlyCreatedClient) return;
    if (!caseFormData.title.trim()) {
        addToast("O título do caso é obrigatório.", "error");
        return;
    }
    try {
      await saveCase({
        ...caseFormData,
        clientId: newlyCreatedClient.id,
      });
      addToast(`Caso "${caseFormData.title}" criado com sucesso para ${newlyCreatedClient.name}!`, 'success');
      onClose();
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível criar o caso. Tente novamente.'), 'error');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, isRep = false) => {
    const { name, value } = e.target;
    
    let maskedValue = value;
    if (name === 'phone') {
        maskedValue = maskPhone(value);
    } else if (name === 'cpf') {
        maskedValue = maskCpf(value);
    }

    if (isRep) {
        setFormData(prev => ({ ...prev, legalRepresentative: { ...prev.legalRepresentative!, [name]: maskedValue } }));
    } else {
        setFormData(prev => ({ ...prev, [name]: maskedValue }));
    }
  };

  const handleCaseFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCaseFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFieldAiFilled = (fieldName: string, isRep = false) => aiFilledFields.has(isRep ? `rep_${fieldName}` : fieldName);

  if (!isOpen) return null;

  const AiUploadSection: React.FC<{isRep: boolean}> = ({ isRep }) => (
    <div className={`p-6 rounded-lg text-center ${isRep ? 'bg-blue-50 border-blue-200' : 'bg-sky-50 border-sky-200'} border-2 border-dashed`}>
        <Bot size={32} className={`mx-auto ${isRep ? 'text-blue-500' : 'text-sky-500'}`} />
        <h3 className="mt-2 text-lg font-medium text-slate-900">{isRep ? 'Dados do Representante' : 'Poupe tempo com IA'}</h3>
        <p className="mt-1 text-sm text-slate-600">
            {isAIAvailable ? 'Escolha o tipo de documento e envie o arquivo. A IA preencherá os dados para você.' : 'Integração de IA desativada. Configure a URL do proxy VITE_AI_PROXY_URL para habilitar o preenchimento automático.'}
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {docTypes.map(doc => (
                <button
                    key={doc.name}
                    type="button"
                    onClick={() => handleDocTypeClick(doc.name, isRep)}
                    disabled={!isAIAvailable}
                    className={`flex flex-col items-center justify-center p-3 border-2 border-slate-300 border-dashed rounded-lg text-slate-600 transition-colors ${
                        isAIAvailable
                            ? 'hover:border-sky-500 hover:bg-white hover:text-sky-600'
                            : 'cursor-not-allowed opacity-60'
                    }`}
                >
                    {React.cloneElement(doc.icon as React.ReactElement, { size: 20 })}
                    <span className="mt-1.5 text-xs font-semibold">{doc.name}</span>
                </button>
            ))}
        </div>
        {!isAIAvailable && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <Info size={14} className="text-amber-600" />
                <span>Adicione a variável VITE_AI_PROXY_URL ao ambiente para ativar a leitura automática de documentos.</span>
            </div>
        )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col focus:outline-none"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-form-modal-title"
        aria-describedby="client-form-modal-description"
        tabIndex={-1}
      >
        <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" />
        <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800" id="client-form-modal-title">
                {step === 'clientDetails' ? (initialData ? 'Editar Cliente' : 'Novo Cliente') : `Novo Caso para ${newlyCreatedClient?.name}`}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              aria-label="Fechar formulário de cliente"
              type="button"
            >
              <X size={22} aria-hidden="true" />
            </button>
        </div>
        <p id="client-form-modal-description" className="sr-only">
          Preencha os dados cadastrais do cliente e avance para criar um novo caso quando necessário.
        </p>
        <div className="flex-1 flex flex-col min-h-0">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center" role="status" aria-live="assertive">
                <Loader2 className="h-12 w-12 animate-spin text-sky-600" aria-hidden="true" />
                <p className="mt-4 font-semibold text-slate-700">Analisando documento...</p>
              </div>
            )}
            {step === 'clientDetails' ? (
                <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col min-h-0">
                    <div className="border-b border-slate-200 px-6">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                            <TabButton icon={<User size={16}/>} label="Contato & IA" isActive={currentTab === 'contact'} onClick={() => setCurrentTab('contact')} />
                            <TabButton icon={<FileBadge size={16}/>} label="Dados Pessoais" isActive={currentTab === 'personal'} onClick={() => setCurrentTab('personal')} />
                            <TabButton icon={<MapPin size={16}/>} label="Endereço" isActive={currentTab === 'address'} onClick={() => setCurrentTab('address')} />
                            <TabButton icon={<Shield size={16}/>} label="Representante" isActive={currentTab === 'representative'} onClick={() => setCurrentTab('representative')} isDisabled={!isUnderage} />
                        </nav>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        {currentTab === 'contact' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                                <div className="md:col-span-2 space-y-4">
                                    <FormField label="Email" htmlFor="email"><input ref={firstFieldRef} type="email" name="email" id="email" value={formData.email} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                    <FormField label="Telefone" htmlFor="phone"><input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                </div>
                                <div className="md:col-span-2"><AiUploadSection isRep={false} /></div>
                            </div>
                        )}
                        {currentTab === 'personal' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <FormField label="Nome Completo" htmlFor="name" isAiFilled={isFieldAiFilled('name')} className="md:col-span-2"><input type="text" name="name" id="name" value={formData.name} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="CPF" htmlFor="cpf" isAiFilled={isFieldAiFilled('cpf')}><input type="text" name="cpf" id="cpf" value={formData.cpf} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Data de Nascimento" htmlFor="dateOfBirth" isAiFilled={isFieldAiFilled('dateOfBirth')}><input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Nome da Mãe" htmlFor="motherName" isAiFilled={isFieldAiFilled('motherName')}><input type="text" name="motherName" id="motherName" value={formData.motherName} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Nome do Pai" htmlFor="fatherName" isAiFilled={isFieldAiFilled('fatherName')}><input type="text" name="fatherName" id="fatherName" value={formData.fatherName} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="RG / Nº Certidão" htmlFor="rg" isAiFilled={isFieldAiFilled('rg')}><input type="text" name="rg" id="rg" value={formData.rg} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Data de Emissão" htmlFor="dataEmissao" isAiFilled={isFieldAiFilled('dataEmissao')}><input type="date" name="dataEmissao" id="dataEmissao" value={formData.dataEmissao} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Órgão Emissor" htmlFor="rgIssuer" isAiFilled={isFieldAiFilled('rgIssuer')}><input type="text" name="rgIssuer" id="rgIssuer" value={formData.rgIssuer} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="UF Emissor" htmlFor="rgIssuerUF" isAiFilled={isFieldAiFilled('rgIssuerUF')}><input type="text" name="rgIssuerUF" id="rgIssuerUF" value={formData.rgIssuerUF} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Nacionalidade" htmlFor="nacionalidade" isAiFilled={isFieldAiFilled('nacionalidade')}><input type="text" name="nacionalidade" id="nacionalidade" value={formData.nacionalidade} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Naturalidade" htmlFor="naturalidade" isAiFilled={isFieldAiFilled('naturalidade')}><input type="text" name="naturalidade" id="naturalidade" value={formData.naturalidade} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Profissão" htmlFor="profissao" isAiFilled={isFieldAiFilled('profissao')}><input type="text" name="profissao" id="profissao" value={formData.profissao} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                <FormField label="Estado Civil" htmlFor="estadoCivil" isAiFilled={isFieldAiFilled('estadoCivil')}><select name="estadoCivil" id="estadoCivil" value={formData.estadoCivil} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"><option value="">Selecione...</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>União Estável</option></select></FormField>
                            </div>
                        )}
                        {currentTab === 'address' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                                <div className="relative md:col-span-2"><FormField label="CEP" htmlFor="cep"><input type="text" name="cep" id="cep" value={formData.cep} onChange={(e) => handleCepChange(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" maxLength={9} /></FormField><div className="absolute inset-y-0 right-0 top-6 flex items-center pr-3">{isCepLoading && <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />}</div></div>
                                <div className="md:col-span-4"><FormField label="Rua / Logradouro" htmlFor="street"><input type="text" name="street" id="street" value={formData.street} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isCepLoading} /></FormField></div>
                                <div className="md:col-span-1"><FormField label="Número" htmlFor="number"><input type="text" name="number" id="number" value={formData.number} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField></div>
                                <div className="md:col-span-3"><FormField label="Complemento" htmlFor="complement"><input type="text" name="complement" id="complement" value={formData.complement} onChange={handleFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField></div>
                                <div className="md:col-span-2"><FormField label="Bairro" htmlFor="neighborhood"><input type="text" name="neighborhood" id="neighborhood" value={formData.neighborhood} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isCepLoading} /></FormField></div>
                                <div className="md:col-span-1"><FormField label="Cidade" htmlFor="city"><input type="text" name="city" id="city" value={formData.city} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isCepLoading} /></FormField></div>
                                <div className="md:col-span-1"><FormField label="Estado (UF)" htmlFor="state"><input type="text" name="state" id="state" value={formData.state} onChange={handleFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isCepLoading} /></FormField></div>
                            </div>
                        )}
                        {currentTab === 'representative' && isUnderage && (
                            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg space-y-6">
                                <div>
                                    <div className="flex items-center text-blue-800 mb-3"><AlertTriangle className="mr-2"/><h3 className="text-lg font-medium">Representante Legal Necessário</h3></div>
                                    <p className="text-sm text-blue-700">Como o cliente é menor de idade, é necessário preencher os dados do representante legal.</p>
                                </div>
                                <AiUploadSection isRep={true} />
                                
                                <div className="pt-4 border-t border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-4">Dados Pessoais do Representante</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        <FormField label="Nome Completo" htmlFor="rep_name" isAiFilled={isFieldAiFilled('name', true)} className="md:col-span-2"><input type="text" name="name" id="rep_name" value={formData.legalRepresentative?.name} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="CPF" htmlFor="rep_cpf" isAiFilled={isFieldAiFilled('cpf', true)}><input type="text" name="cpf" id="rep_cpf" value={formData.legalRepresentative?.cpf} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Data de Nascimento" htmlFor="rep_dateOfBirth" isAiFilled={isFieldAiFilled('dateOfBirth', true)}><input type="date" name="dateOfBirth" id="rep_dateOfBirth" value={formData.legalRepresentative?.dateOfBirth} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Nome da Mãe" htmlFor="rep_motherName" isAiFilled={isFieldAiFilled('motherName', true)}><input type="text" name="motherName" id="rep_motherName" value={formData.legalRepresentative?.motherName} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Nome do Pai" htmlFor="rep_fatherName" isAiFilled={isFieldAiFilled('fatherName', true)}><input type="text" name="fatherName" id="rep_fatherName" value={formData.legalRepresentative?.fatherName} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="RG / Nº Certidão" htmlFor="rep_rg" isAiFilled={isFieldAiFilled('rg', true)}><input type="text" name="rg" id="rep_rg" value={formData.legalRepresentative?.rg} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Data de Emissão" htmlFor="rep_dataEmissao" isAiFilled={isFieldAiFilled('dataEmissao', true)}><input type="date" name="dataEmissao" id="rep_dataEmissao" value={formData.legalRepresentative?.dataEmissao} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Órgão Emissor" htmlFor="rep_rgIssuer" isAiFilled={isFieldAiFilled('rgIssuer', true)}><input type="text" name="rgIssuer" id="rep_rgIssuer" value={formData.legalRepresentative?.rgIssuer} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="UF Emissor" htmlFor="rep_rgIssuerUF" isAiFilled={isFieldAiFilled('rgIssuerUF', true)}><input type="text" name="rgIssuerUF" id="rep_rgIssuerUF" value={formData.legalRepresentative?.rgIssuerUF} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Nacionalidade" htmlFor="rep_nacionalidade" isAiFilled={isFieldAiFilled('nacionalidade', true)}><input type="text" name="nacionalidade" id="rep_nacionalidade" value={formData.legalRepresentative?.nacionalidade} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Naturalidade" htmlFor="rep_naturalidade" isAiFilled={isFieldAiFilled('naturalidade', true)}><input type="text" name="naturalidade" id="rep_naturalidade" value={formData.legalRepresentative?.naturalidade} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Profissão" htmlFor="rep_profissao" isAiFilled={isFieldAiFilled('profissao', true)}><input type="text" name="profissao" id="rep_profissao" value={formData.legalRepresentative?.profissao} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Estado Civil" htmlFor="rep_estadoCivil" isAiFilled={isFieldAiFilled('estadoCivil', true)}><select name="estadoCivil" id="rep_estadoCivil" value={formData.legalRepresentative?.estadoCivil} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"><option value="">Selecione...</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>União Estável</option></select></FormField>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-4">Dados de Contato do Representante</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        <FormField label="Email" htmlFor="rep_email"><input type="email" name="email" id="rep_email" value={formData.legalRepresentative?.email} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                        <FormField label="Telefone" htmlFor="rep_phone"><input type="tel" name="phone" id="rep_phone" value={formData.legalRepresentative?.phone} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-4">Endereço do Representante</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                                        <div className="relative md:col-span-2"><FormField label="CEP" htmlFor="rep_cep"><input type="text" name="cep" id="rep_cep" value={formData.legalRepresentative?.cep} onChange={(e) => handleRepCepChange(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" maxLength={9} /></FormField><div className="absolute inset-y-0 right-0 top-6 flex items-center pr-3">{isRepCepLoading && <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />}</div></div>
                                        <div className="md:col-span-4"><FormField label="Rua / Logradouro" htmlFor="rep_street"><input type="text" name="street" id="rep_street" value={formData.legalRepresentative?.street} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isRepCepLoading} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Número" htmlFor="rep_number"><input type="text" name="number" id="rep_number" value={formData.legalRepresentative?.number} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField></div>
                                        <div className="md:col-span-3"><FormField label="Complemento" htmlFor="rep_complement"><input type="text" name="complement" id="rep_complement" value={formData.legalRepresentative?.complement} onChange={(e) => handleFormChange(e, true)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></FormField></div>
                                        <div className="md:col-span-2"><FormField label="Bairro" htmlFor="rep_neighborhood"><input type="text" name="neighborhood" id="rep_neighborhood" value={formData.legalRepresentative?.neighborhood} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isRepCepLoading} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Cidade" htmlFor="rep_city"><input type="text" name="city" id="rep_city" value={formData.legalRepresentative?.city} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isRepCepLoading} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Estado (UF)" htmlFor="rep_state"><input type="text" name="state" id="rep_state" value={formData.legalRepresentative?.state} onChange={(e) => handleFormChange(e, true)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm bg-slate-50" readOnly={isRepCepLoading} /></FormField></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                    </div>
                    <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">Cancelar</button>
                        <button type="button" onClick={handleSaveAndClose} className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">Salvar e Fechar</button>
                        {!initialData && <button type="button" onClick={handleSaveAndCreateCase} className="px-4 py-2 bg-emerald-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-emerald-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">Salvar e Criar Caso <ArrowRight size={16} className="ml-2" /></button>}
                    </div>
                </form>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                        <div><label htmlFor="case-title" className="block text-sm font-medium text-slate-700">Título do Caso</label><input type="text" name="title" id="case-title" value={caseFormData.title} onChange={handleCaseFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" placeholder="Ex: Recurso Administrativo, Análise de Provas, etc."/></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="case-nature" className="block text-sm font-medium text-slate-700">Natureza da Ação</label><select name="nature" id="case-nature" value={caseFormData.nature} onChange={handleCaseFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"><option value="Administrativo">Administrativo</option><option value="Judicial">Judicial</option></select></div>
                            <div><label htmlFor="case-benefitType" className="block text-sm font-medium text-slate-700">Tipo de Ação</label><select name="benefitType" id="case-benefitType" value={caseFormData.benefitType} onChange={handleCaseFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">{benefitTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                        </div>
                        <div><label htmlFor="case-caseNumber" className="block text-sm font-medium text-slate-700">Número do Processo (Opcional)</label><input type="text" name="caseNumber" id="case-caseNumber" value={caseFormData.caseNumber} onChange={handleCaseFormChange} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></div>
                        <div><label htmlFor="case-status" className="block text-sm font-medium text-slate-700">Status</label><select name="status" id="case-status" value={caseFormData.status} onChange={handleCaseFormChange} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">{caseStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></div>
                        <div><label htmlFor="case-notes" className="block text-sm font-medium text-slate-700">Notas Iniciais</label><textarea name="notes" id="case-notes" value={caseFormData.notes} onChange={handleCaseFormChange} rows={3} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" /></div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
                        <button type="button" onClick={() => setStep('clientDetails')} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">Voltar</button>
                        <button type="button" onClick={handleSaveCase} className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700">Salvar Caso</button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ClientFormModal;
