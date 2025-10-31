import React, { useState } from 'react';
import { Case, DocumentTemplate, LegalDocument } from '../../types';
import { useCases } from '../../context/CasesContext';
import { useSettings } from '../../context/SettingsContext';
import { FileSignature, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import GenerateDocumentModal from '../documents/GenerateDocumentModal';

interface LegalDocumentsManagerProps {
  caseData: Case;
}

const LegalDocumentsManager: React.FC<LegalDocumentsManagerProps> = ({ caseData }) => {
  const { updateCaseLegalDocumentStatus } = useCases();
  const { documentTemplates } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  const handleGenerateClick = (templateId: string) => {
    const template = documentTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleGenerationComplete = (templateId: string) => {
    updateCaseLegalDocumentStatus(caseData.id, templateId, 'Gerado');
  };

  const handleStatusChange = (templateId: string, status: LegalDocument['status']) => {
    updateCaseLegalDocumentStatus(caseData.id, templateId, status);
  };

  const getStatusInfo = (status: LegalDocument['status']): { icon: React.ReactNode, color: string } => {
    switch (status) {
      case 'Assinado': return { icon: <CheckCircle size={16} />, color: 'text-emerald-600 bg-emerald-100' };
      case 'Gerado': return { icon: <Clock size={16} />, color: 'text-sky-600 bg-sky-100' };
      case 'Pendente':
      default:
        return { icon: <AlertCircle size={16} />, color: 'text-yellow-600 bg-yellow-100' };
    }
  };

  return (
    <>
      {selectedTemplate && (
        <GenerateDocumentModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          template={selectedTemplate}
          preselectedClientId={caseData.clientId}
          preselectedCaseId={caseData.id}
          onGenerationComplete={() => handleGenerationComplete(selectedTemplate.id)}
        />
      )}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Documentos Jurídicos</h2>
        <div className="space-y-3">
          {caseData.legalDocuments.map(doc => {
            const statusInfo = getStatusInfo(doc.status);
            return (
              <div key={doc.templateId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`p-1.5 rounded-full mr-3 ${statusInfo.color}`}>
                    {statusInfo.icon}
                  </div>
                  <span className="font-medium text-slate-700">{doc.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <select 
                    value={doc.status} 
                    onChange={(e) => handleStatusChange(doc.templateId, e.target.value as LegalDocument['status'])}
                    className={`text-xs border-0 rounded-full font-semibold appearance-none cursor-pointer ${statusInfo.color}`}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Gerado">Gerado</option>
                    <option value="Assinado">Assinado</option>
                  </select>
                  <button
                    onClick={() => handleGenerateClick(doc.templateId)}
                    className="flex items-center text-xs bg-sky-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-sky-700"
                  >
                    <FileSignature size={14} className="mr-1.5" />
                    {doc.status === 'Gerado' || doc.status === 'Assinado' ? 'Gerar Novamente' : 'Gerar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LegalDocumentsManager;
