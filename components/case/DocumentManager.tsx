import React, { useRef, useState } from 'react';
import { Case, CaseDocument, DocumentFileType } from '../../types';
import { CheckCircle, XCircle, Upload, File, FileText, FileImage, Trash2, Eye, Sparkles, Loader2 } from 'lucide-react';
import { useCases } from '../../context/CasesContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import { classifyDocument } from '../../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

interface DocumentManagerProps {
  caseData: Case;
  clientBenefitType: string;
}

const getFileIcon = (type: DocumentFileType) => {
    switch (type) {
        case 'pdf': return <FileText className="text-red-500" size={24} />;
        case 'doc':
        case 'docx': return <FileText className="text-blue-500" size={24} />;
        case 'jpg':
        case 'jpeg':
        case 'png': return <FileImage className="text-green-500" size={24} />;
        default: return <File className="text-slate-500" size={24} />;
    }
};

const getFileType = (fileName: string): DocumentFileType => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'doc' || extension === 'docx') return 'doc';
    if (extension === 'jpg' || extension === 'jpeg') return 'jpeg';
    if (extension === 'png') return 'png';
    return 'other';
};

const DocumentManager: React.FC<DocumentManagerProps> = ({ caseData, clientBenefitType }) => {
  const { addDocumentToCase, deleteDocumentFromCase } = useCases();
  const { documentChecklistConfig } = useSettings();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocName, setUploadingDocName] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<CaseDocument | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuggestion, setAnalysisSuggestion] = useState<{ file: File; suggestedCategory: string } | null>(null);

  const uploadedDocNames = caseData.documents.map(doc => doc.name.toLowerCase());

  const isDocUploaded = (docName: string) => {
    const simplifiedName = docName.toLowerCase().split('(')[0].trim().replace(/ /g, '_');
    return uploadedDocNames.some(uploaded => uploaded.startsWith(simplifiedName));
  };

  const handleUploadClick = (docName: string | null) => {
    setUploadingDocName(docName);
    fileInputRef.current?.click();
  };

  const saveDocument = async (file: File, fileName: string) => {
    const newDocument: Omit<CaseDocument, 'uploadedAt'> = {
        name: fileName,
        url: URL.createObjectURL(file), // Placeholder URL
        type: getFileType(fileName),
    };
    await addDocumentToCase(caseData.id, newDocument);
    addToast(`Documento "${fileName}" adicionado com sucesso!`, 'success');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (uploadingDocName) {
        const newFileName = `${uploadingDocName.replace(/ /g, '_').toLowerCase()}_${Date.now()}.${file.name.split('.').pop()}`;
        saveDocument(file, newFileName);
    } else {
        setIsAnalyzing(true);
        setAnalysisSuggestion(null);
        try {
            const checklist = documentChecklistConfig[clientBenefitType] || documentChecklistConfig["Outro"] || [];
            let content: string;
            let mimeType: string | null = null;

            if (file.type.startsWith('image/')) {
                mimeType = file.type;
                content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
                }
                content = fullText;
            } else {
                saveDocument(file, file.name);
                setIsAnalyzing(false);
                return;
            }

            const suggestedCategory = await classifyDocument(content, mimeType, checklist);

            if (suggestedCategory && suggestedCategory !== 'Outro') {
                setAnalysisSuggestion({ file, suggestedCategory });
            } else {
                saveDocument(file, file.name);
                addToast('Documento adicionado. A IA não sugeriu uma categoria.', 'info');
            }
        } catch (error) {
            console.error("Error during document analysis:", error);
            addToast('Erro ao analisar o documento. Enviando como avulso.', 'error');
            saveDocument(file, file.name);
        } finally {
            setIsAnalyzing(false);
        }
    }

    if(event.target) event.target.value = '';
    setUploadingDocName(null);
  };

  const confirmDelete = async () => {
    if (docToDelete) {
        await deleteDocumentFromCase(caseData.id, docToDelete.name);
        addToast(`Documento "${docToDelete.name}" excluído.`, 'info');
        setDocToDelete(null);
    }
  };

  const handleConfirmSuggestion = () => {
    if (!analysisSuggestion) return;
    const { file, suggestedCategory } = analysisSuggestion;
    const newFileName = `${suggestedCategory.replace(/ /g, '_').toLowerCase()}_${Date.now()}.${file.name.split('.').pop()}`;
    saveDocument(file, newFileName);
    setAnalysisSuggestion(null);
  };

  const handleIgnoreSuggestion = () => {
      if (!analysisSuggestion) return;
      const { file } = analysisSuggestion;
      saveDocument(file, file.name);
      addToast('Sugestão ignorada. Documento salvo com nome original.', 'info');
      setAnalysisSuggestion(null);
  };

  const docsForBenefit = documentChecklistConfig[clientBenefitType] || documentChecklistConfig["Outro"] || [];

  return (
    <>
      <ConfirmationModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Documento"
        message={`Tem certeza que deseja excluir o documento "${docToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <h2 className="text-xl font-bold text-slate-800 mb-4">Gerenciador de Documentos</h2>
        
        {isAnalyzing && (
            <div className="p-4 my-4 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center">
                <Loader2 className="animate-spin mr-3 text-sky-600" />
                <span className="text-sky-700 font-medium">Analisando documento com IA...</span>
            </div>
        )}

        {analysisSuggestion && (
            <div className="p-4 my-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Sparkles className="text-emerald-600 mr-3" />
                        <div>
                            <p className="font-semibold text-emerald-800">Sugestão da IA</p>
                            <p className="text-sm text-emerald-700">
                                Este documento parece ser um(a) <strong>"{analysisSuggestion.suggestedCategory}"</strong>.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleIgnoreSuggestion} className="text-xs px-3 py-1 bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Ignorar</button>
                        <button onClick={handleConfirmSuggestion} className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Checklist para {clientBenefitType}:</h3>
            {docsForBenefit.length > 0 ? (
                <ul className="space-y-2">
                {docsForBenefit.map(docName => {
                    const uploaded = isDocUploaded(docName);
                    return (
                    <li key={docName} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-slate-50">
                        <div className="flex items-center">
                        {uploaded ? <CheckCircle size={16} className="text-emerald-500 mr-2 flex-shrink-0" /> : <XCircle size={16} className="text-red-500 mr-2 flex-shrink-0" />}
                        <span className={uploaded ? 'text-slate-500 line-through' : 'text-slate-800'}>{docName}</span>
                        </div>
                        {!uploaded && <button onClick={() => handleUploadClick(docName)} className="flex items-center text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-md hover:bg-sky-200"><Upload size={12} className="mr-1" /> Enviar</button>}
                    </li>
                    );
                })}
                </ul>
            ) : (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum checklist configurado.</p>
            )}
        </div>

        <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-600">Documentos Anexados ({caseData.documents.length})</h3>
                <button onClick={() => handleUploadClick(null)} className="flex items-center text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-md hover:bg-slate-300"><Upload size={12} className="mr-1" /> Envio Avulso</button>
            </div>
            {caseData.documents.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {caseData.documents.map(doc => (
                        <li key={doc.name} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 group">
                            <div className="flex items-center min-w-0">
                                {getFileIcon(doc.type)}
                                <div className="ml-3 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                                    <p className="text-xs text-slate-500">Enviado em: {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><Eye size={16} /></a>
                                <button onClick={() => setDocToDelete(doc)} className="p-1.5 rounded-full hover:bg-red-100 text-slate-500 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-slate-500 text-center py-8">Nenhum documento anexado a este caso.</p>
            )}
        </div>
      </div>
    </>
  );
};

export default DocumentManager;
