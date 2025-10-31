import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { DocumentTemplate } from '../types';
import { FileText, FileSignature, PlusCircle, Edit, Trash2, Info } from 'lucide-react';
import GenerateDocumentModal from '../components/documents/GenerateDocumentModal';
import TemplateFormModal from '../components/documents/TemplateFormModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useToast } from '../context/ToastContext';

type ModalState = {
    type: 'generate' | 'edit' | 'add' | 'delete';
    template?: DocumentTemplate;
} | null;

export default function DocumentTemplates() {
  const { documentTemplates, deleteTemplate } = useSettings();
  const { addToast } = useToast();
  const [modalState, setModalState] = useState<ModalState>(null);

  const handleGenerateClick = (template: DocumentTemplate) => {
    setModalState({ type: 'generate', template });
  };

  const handleEditClick = (template: DocumentTemplate) => {
    setModalState({ type: 'edit', template });
  };

  const handleAddClick = () => {
    setModalState({ type: 'add' });
  };

  const handleDeleteClick = (template: DocumentTemplate) => {
    setModalState({ type: 'delete', template });
  };

  const handleCloseModal = () => {
    setModalState(null);
  };

  const confirmDelete = () => {
    if (modalState?.type === 'delete' && modalState.template) {
        deleteTemplate(modalState.template.id);
        addToast('Modelo excluído com sucesso!', 'info');
    }
  };

  return (
    <>
      {modalState?.type === 'generate' && modalState.template && (
        <GenerateDocumentModal
          isOpen={true}
          onClose={handleCloseModal}
          template={modalState.template}
        />
      )}
      {(modalState?.type === 'add' || modalState?.type === 'edit') && (
        <TemplateFormModal
          isOpen={true}
          onClose={handleCloseModal}
          initialData={modalState.type === 'edit' ? modalState.template || null : null}
        />
      )}
      {modalState?.type === 'delete' && modalState.template && (
        <ConfirmationModal
            isOpen={true}
            onClose={handleCloseModal}
            onConfirm={confirmDelete}
            title="Excluir Modelo"
            message={`Tem certeza que deseja excluir o modelo "${modalState.template.title}"? Esta ação não pode ser desfeita.`}
            confirmText="Excluir"
        />
      )}
      
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Modelos de Documentos</h1>
            <p className="text-slate-600 mt-1">Crie, edite e gere documentos rapidamente.</p>
          </div>
          <button onClick={handleAddClick} className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-colors">
            <PlusCircle size={20} className="mr-2" />
            Novo Modelo
          </button>
        </header>

        <div className="bg-sky-50 border-l-4 border-sky-500 text-sky-800 p-4 rounded-r-lg">
            <div className="flex">
                <div className="py-1"><Info size={20} className="mr-3" /></div>
                <div>
                    <h3 className="font-bold">Como usar Placeholders</h3>
                    <p className="text-sm">
                        Use placeholders como <code>&#123;&#123;cliente.name&#125;&#125;</code> no conteúdo do seu modelo para inserir automaticamente dados do cliente ou do caso.
                        A lista completa de placeholders disponíveis pode ser vista ao criar ou editar um modelo.
                    </p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentTemplates.map(template => (
            <div key={template.id} className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start">
                    <FileText className="h-10 w-10 text-sky-500 mb-4" />
                    <div className="flex space-x-2">
                        <button onClick={() => handleEditClick(template)} className="p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-sky-600 transition-opacity">
                            <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteClick(template)} className="p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-red-600 transition-opacity">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                <h2 className="text-lg font-bold text-slate-800">{template.title}</h2>
                <p className="text-sm text-slate-500 mt-2 line-clamp-3 h-16">{template.content}</p>
              </div>
              <button onClick={() => handleGenerateClick(template)} className="mt-6 w-full flex items-center justify-center bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-colors">
                <FileSignature size={20} className="mr-2" />
                Gerar Documento
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
