import React, { useState, useMemo, useEffect } from 'react';
import { DocumentTemplate, Client, Case } from '../../types';
import { useCrmData } from '../../context/CrmContext';
import { X, Copy, Printer, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { copyToClipboard } from '../../utils/clipboard';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate;
  preselectedClientId?: string;
  preselectedCaseId?: string;
  onGenerationComplete?: () => void;
}

const replacePlaceholders = (content: string, client: Client, firmInfo: any, caseData?: Case): string => {
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('pt-BR');
    const todayExtended = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const allData = {
        cliente: client,
        caso: caseData,
        escritorio: firmInfo,
        data: {
            hoje: todayFormatted,
            hoje_extenso: todayExtended,
        }
    };

    let replacedContent = content.replace(/{{(.*?)}}/g, (match, key) => {
        const keys = key.trim().split('.');
        let current: any = allData;
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return match; // Placeholder not found, keep it
            }
        }
        // Format dates if they are valid date strings
        if (typeof current === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(current)) {
            return new Date(current + 'T00:00:00').toLocaleDateString('pt-BR');
        }
        return String(current || '');
    });

    return replacedContent;
};

const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({ isOpen, onClose, template, preselectedClientId, preselectedCaseId, onGenerationComplete }) => {
  const { clients, cases, firmInfo } = useCrmData();
  const { addToast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(preselectedCaseId || '');
  
  useEffect(() => {
    if (isOpen) {
        if (preselectedClientId) {
            setSelectedClientId(preselectedClientId);
        } else if (clients.length > 0) {
            // Don't default select, force user action
            setSelectedClientId('');
        }
        
        if (preselectedCaseId) {
            setSelectedCaseId(preselectedCaseId);
        } else {
            setSelectedCaseId('');
        }
    }
  }, [preselectedClientId, preselectedCaseId, isOpen, clients]);

  const clientCases = useMemo(() => {
    return cases.filter(c => c.clientId === selectedClientId);
  }, [selectedClientId, cases]);

  const generatedContent = useMemo(() => {
    if (!selectedClientId) return null; // Return null if no client is selected
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return null;
    
    const caseData = cases.find(c => c.id === selectedCaseId);
    return replacePlaceholders(template.content, client, firmInfo, caseData);
  }, [template, selectedClientId, selectedCaseId, clients, cases, firmInfo]);

  const handleCopyToClipboard = () => {
    if (!generatedContent) {
        addToast('Selecione um cliente para gerar o documento primeiro.', 'error');
        return;
    }
    copyToClipboard(
        generatedContent,
        () => addToast('Documento copiado para a área de transferência!', 'success'),
        () => addToast('Falha ao copiar o documento.', 'error')
    );
  };

  const handlePrint = () => {
    if (!generatedContent) {
        addToast('Selecione um cliente para gerar o documento primeiro.', 'error');
        return;
    }
    const printableWindow = window.open('', '_blank');
    if (printableWindow) {
        const { headerImage, footerImage, backgroundImage } = template;
        const printHTML = `
            <html>
                <head>
                    <title>${template.title}</title>
                    <style>
                        @media print {
                            /* @page rule enforces A4 printing standard */
                            @page {
                                size: A4;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                        body {
                            font-family: 'Times New Roman', Times, serif;
                            font-size: 12pt;
                            line-height: 1.5;
                        }
                        .page-container {
                            position: relative;
                            min-height: 297mm; /* A4 height */
                            width: 210mm; /* A4 width */
                            margin: auto;
                            display: flex;
                            flex-direction: column;
                            background-color: white;
                        }
                        .background-image {
                            position: absolute;
                            top: 0; left: 0; right: 0; bottom: 0;
                            background-image: url(${backgroundImage || ''});
                            background-repeat: no-repeat;
                            background-position: center;
                            background-size: cover;
                            opacity: 0.1; /* Example opacity */
                            z-index: -1;
                        }
                        .header, .footer {
                            position: absolute;
                            left: 2cm;
                            right: 2cm;
                            width: calc(100% - 4cm);
                            text-align: center;
                        }
                        .header { top: 1cm; height: 4cm; }
                        .footer { bottom: 1cm; height: 2cm; }
                        .header img, .footer img {
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                        }
                        .content {
                            padding: 6cm 2cm 4cm 2cm; /* top, sides, bottom */
                            flex-grow: 1;
                            white-space: pre-wrap;
                            text-align: justify;
                        }
                    </style>
                </head>
                <body>
                    <div class="page-container">
                        ${backgroundImage ? '<div class="background-image"></div>' : ''}
                        ${headerImage ? `<header class="header"><img src="${headerImage}" alt="Cabeçalho"></header>` : ''}
                        <main class="content">${generatedContent}</main>
                        ${footerImage ? `<footer class="footer"><img src="${footerImage}" alt="Rodapé"></footer>` : ''}
                    </div>
                </body>
            </html>
        `;
        printableWindow.document.write(printHTML);
        printableWindow.document.close();
        printableWindow.focus();
        setTimeout(() => { // Timeout to ensure images are loaded
            printableWindow.print();
            printableWindow.close();
        }, 500);
        onGenerationComplete?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Gerar: {template.title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={24} className="text-slate-600" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b">
            <div>
                <label htmlFor="client-select" className="block text-sm font-medium text-slate-700">Selecione o Cliente</label>
                <select id="client-select" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" disabled={!!preselectedClientId}>
                    <option value="">-- Selecione --</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="case-select" className="block text-sm font-medium text-slate-700">Selecione o Caso (Opcional)</label>
                <select id="case-select" value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)} disabled={!selectedClientId || clientCases.length === 0 || !!preselectedCaseId} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm disabled:bg-slate-100">
                    <option value="">-- Nenhum --</option>
                    {clientCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {generatedContent ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{generatedContent}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <Info size={40} className="mb-4" />
                <h3 className="font-semibold text-lg text-slate-700">Aguardando Seleção</h3>
                <p>Selecione um cliente para preencher as variáveis do documento.</p>
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-100 border-t flex justify-end space-x-3">
          <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center disabled:opacity-50" disabled={!generatedContent}>
            <Copy size={16} className="mr-2" /> Copiar Texto
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700 flex items-center disabled:opacity-50" disabled={!generatedContent}>
            <Printer size={16} className="mr-2" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateDocumentModal;
