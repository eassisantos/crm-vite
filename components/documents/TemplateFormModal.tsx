import React, { useState, useEffect } from 'react';
import { DocumentTemplate } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { X, Image, Type, ListChecks } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import ImageUploader from './ImageUploader';
import { PLACEHOLDER_GROUPS } from '../../constants';
import { copyToClipboard } from '../../utils/clipboard';

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: DocumentTemplate | null;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({ isOpen, onClose, initialData }) => {
  const { addTemplate, updateTemplate } = useSettings();
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [headerImage, setHeaderImage] = useState<string | undefined>('');
  const [footerImage, setFooterImage] = useState<string | undefined>('');
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>('');
  const [activeTab, setActiveTab] = useState<'content' | 'layout'>('content');

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setTitle(initialData.title);
            setContent(initialData.content);
            setHeaderImage(initialData.headerImage);
            setFooterImage(initialData.footerImage);
            setBackgroundImage(initialData.backgroundImage);
        } else {
            setTitle('');
            setContent('');
            setHeaderImage('');
            setFooterImage('');
            setBackgroundImage('');
        }
        setActiveTab('content');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
        addToast('O título e o conteúdo do modelo são obrigatórios.', 'error');
        return;
    }
    const templateData = { title, content, headerImage, footerImage, backgroundImage };
    if (initialData) {
      updateTemplate({ ...initialData, ...templateData });
      addToast('Modelo atualizado com sucesso!', 'success');
    } else {
      addTemplate(templateData);
      addToast('Novo modelo criado com sucesso!', 'success');
    }
    onClose();
  };

  const handleCopyPlaceholder = (placeholder: string) => {
    copyToClipboard(
        placeholder,
        () => addToast('Placeholder copiado!', 'info'),
        () => addToast('Falha ao copiar o placeholder.', 'error')
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">{initialData ? 'Editar Modelo' : 'Novo Modelo'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={24} className="text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-6 flex-1 flex flex-col md:flex-row gap-6 min-h-0">
            <div className="md:w-2/3 flex flex-col">
                <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700">Título do Modelo</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" />
                </div>
                <div className="flex-1 flex flex-col">
                    <label htmlFor="content" className="block text-sm font-medium text-slate-700">Conteúdo</label>
                    <textarea id="content" value={content} onChange={e => setContent(e.target.value)} required className="mt-1 block w-full flex-1 border-slate-300 rounded-md shadow-sm sm:text-sm font-mono" />
                </div>
            </div>
            <div className="md:w-1/3 p-4 bg-slate-50 rounded-lg flex flex-col">
                <div className="border-b border-slate-200 mb-4">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button type="button" onClick={() => setActiveTab('content')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'content' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ListChecks size={16} className="mr-2"/> Placeholders</button>
                        <button type="button" onClick={() => setActiveTab('layout')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'layout' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Image size={16} className="mr-2"/> Layout</button>
                    </nav>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'content' && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Variáveis Disponíveis</h4>
                            <p className="text-xs text-slate-500 mb-3">Clique para copiar e cole no conteúdo.</p>
                            {Object.entries(PLACEHOLDER_GROUPS).map(([group, list]) => (
                                <div key={group} className="mb-4">
                                    <h5 className="font-semibold text-sm text-slate-600 mb-2">{group}</h5>
                                    <ul className="space-y-1">
                                        {list.map(p => (
                                            <li key={p}><button type="button" onClick={() => handleCopyPlaceholder(p)} className="w-full text-left p-1 rounded text-xs font-mono bg-slate-200 hover:bg-sky-100">{p}</button></li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'layout' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-slate-700 mb-2">Personalização do Layout</h4>
                            <p className="text-xs text-slate-500 mb-3">Adicione imagens para criar um documento timbrado.</p>
                            <ImageUploader label="Imagem do Cabeçalho" currentImage={headerImage} onImageUpload={(b64) => setHeaderImage(b64)} onImageRemove={() => setHeaderImage('')} />
                            <ImageUploader label="Imagem do Rodapé" currentImage={footerImage} onImageUpload={(b64) => setFooterImage(b64)} onImageRemove={() => setFooterImage('')} />
                            <ImageUploader label="Imagem de Fundo" currentImage={backgroundImage} onImageUpload={(b64) => setBackgroundImage(b64)} onImageRemove={() => setBackgroundImage('')} />
                        </div>
                    )}
                </div>
            </div>
          </div>
          <div className="p-6 bg-slate-100 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-sky-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-sky-700">Salvar Modelo</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateFormModal;
