import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useReset } from '../context/ResetContext';
import { useToast } from '../context/ToastContext';
import { Settings, Tag, Plus, Trash2, ListChecks, Type, FileCheck, Briefcase, Bell, Database, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { CaseStatus, FirmInfo, BrandingSettings, NotificationSettings } from '../types';
import ImageUploader from '../components/documents/ImageUploader';
import ConfirmationModal from '../components/common/ConfirmationModal';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-full mr-3">{icon}</div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
        <div className="space-y-4 text-slate-600">{children}</div>
    </div>
);

const CustomizationList: React.FC<{ title: string; items: string[]; onAdd: (item: string) => void; onRemove: (item: string) => void; icon: React.ReactNode; }> = ({ title, items, onAdd, onRemove, icon }) => {
    const [newItem, setNewItem] = useState('');
    const { addToast } = useToast();

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) { addToast('O nome não pode estar vazio.', 'error'); return; }
        if (items.map(i => i.toLowerCase()).includes(newItem.toLowerCase())) { addToast('Este item já existe.', 'error'); return; }
        onAdd(newItem);
        setNewItem('');
        addToast(`'${newItem}' adicionado com sucesso!`, 'success');
    };

    return (
        <div>
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center">{icon} {title}</h3>
            <ul className="space-y-2 mb-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-md">
                {items.map(item => (
                    <li key={item} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                        <span className="text-sm">{item}</span>
                        <button onClick={() => onRemove(item)} className="p-1 text-slate-400 hover:text-red-500 rounded-full"><Trash2 size={16} /></button>
                    </li>
                ))}
            </ul>
            <form onSubmit={handleAdd} className="flex gap-2">
                <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Adicionar novo..." className="flex-grow w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                <button type="submit" className="p-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"><Plus size={20} /></button>
            </form>
        </div>
    );
};

const ChecklistManager: React.FC = () => {
    const { benefitTypes, documentChecklistConfig, updateChecklistItem } = useSettings();
    const { addToast } = useToast();
    const [selectedBenefit, setSelectedBenefit] = useState(benefitTypes[0] || '');
    const [newItem, setNewItem] = useState('');

    const currentChecklist = documentChecklistConfig[selectedBenefit] || [];

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) { addToast('O nome do documento não pode estar vazio.', 'error'); return; }
        updateChecklistItem(selectedBenefit, newItem, 'add');
        setNewItem('');
        addToast(`'${newItem}' adicionado ao checklist.`, 'success');
    };

    const handleRemove = (item: string) => {
        updateChecklistItem(selectedBenefit, item, 'remove');
        addToast(`'${item}' removido do checklist.`, 'success');
    };

    return (
        <div>
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center"><FileCheck size={18} className="mr-2" /> Checklist de Documentos por Tipo de Ação</h3>
            <div className="mb-3">
                <label htmlFor="benefit-type-select" className="block text-sm font-medium text-slate-700">Selecione o Tipo de Ação</label>
                <select id="benefit-type-select" value={selectedBenefit} onChange={e => setSelectedBenefit(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm">
                    {benefitTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            <ul className="space-y-2 mb-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-md">
                {currentChecklist.map(item => (
                    <li key={item} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                        <span className="text-sm">{item}</span>
                        <button onClick={() => handleRemove(item)} className="p-1 text-slate-400 hover:text-red-500 rounded-full"><Trash2 size={16} /></button>
                    </li>
                ))}
                {currentChecklist.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhum item neste checklist.</p>}
            </ul>
            <form onSubmit={handleAdd} className="flex gap-2">
                <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Adicionar novo documento..." className="flex-grow w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                <button type="submit" className="p-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"><Plus size={20} /></button>
            </form>
        </div>
    );
};

export default function Configuracoes() {
    const { firmInfo, brandingSettings, notificationSettings, updateFirmInfo, updateBrandingSettings, updateNotificationSettings, benefitTypes, caseStatuses, addBenefitType, addCaseStatus, removeBenefitType, removeCaseStatus } = useSettings();
    const { resetAllData } = useReset();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [localFirmInfo, setLocalFirmInfo] = useState<FirmInfo>(firmInfo);
    const [localBranding, setLocalBranding] = useState<BrandingSettings>(brandingSettings);
    const [localNotifications, setLocalNotifications] = useState<NotificationSettings>(notificationSettings);

    useEffect(() => { setLocalFirmInfo(firmInfo) }, [firmInfo]);
    useEffect(() => { setLocalBranding(brandingSettings) }, [brandingSettings]);
    useEffect(() => { setLocalNotifications(notificationSettings) }, [notificationSettings]);

    const handleFirmInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFirmInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalNotifications(prev => ({ ...prev, [e.target.name]: Number(e.target.value) }));
    };

    const handleSave = async (section: 'firm' | 'branding' | 'notifications') => {
        setIsSaving(true);
        try {
            if (section === 'firm') await updateFirmInfo(localFirmInfo);
            if (section === 'branding') await updateBrandingSettings(localBranding);
            if (section === 'notifications') await updateNotificationSettings(localNotifications);
            addToast('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            addToast('Erro ao salvar configurações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetData = async () => {
        setIsResetting(true);
        try {
            await resetAllData();
            addToast('Todos os dados foram resetados para o padrão.', 'success');
            window.location.reload();
        } catch (error) {
            addToast('Erro ao resetar os dados.', 'error');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <>
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetData}
                title="Resetar Todos os Dados"
                message="Esta é uma ação irreversível. Todos os clientes, casos, financeiros e configurações personalizadas serão perdidos e restaurados para o padrão inicial. Tem certeza absoluta que deseja continuar?"
                confirmText={isResetting ? "Resetando..." : "Sim, resetar tudo"}
            />
            <div className="space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
                    <p className="text-slate-600 mt-1">Personalize o sistema e gerencie suas preferências.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-8">
                        <Section title="Informações do Escritório" icon={<Briefcase size={24} />}>
                            <div className="space-y-4">
                                <div><label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome do Escritório</label><input type="text" name="name" id="name" value={localFirmInfo.name} onChange={handleFirmInfoChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                <div><label htmlFor="oab" className="block text-sm font-medium text-slate-700">OAB Principal</label><input type="text" name="oab" id="oab" value={localFirmInfo.oab} onChange={handleFirmInfoChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                <div><label htmlFor="email" className="block text-sm font-medium text-slate-700">Email de Contato</label><input type="email" name="email" id="email" value={localFirmInfo.email} onChange={handleFirmInfoChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                <div><label htmlFor="phone" className="block text-sm font-medium text-slate-700">Telefone</label><input type="tel" name="phone" id="phone" value={localFirmInfo.phone} onChange={handleFirmInfoChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                <div><label htmlFor="address" className="block text-sm font-medium text-slate-700">Endereço</label><input type="text" name="address" id="address" value={localFirmInfo.address} onChange={handleFirmInfoChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                <button onClick={() => handleSave('firm')} disabled={isSaving} className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 disabled:bg-slate-400 flex items-center">{isSaving && <Loader2 className="animate-spin mr-2" size={16}/>} Salvar Informações</button>
                            </div>
                        </Section>
                        <Section title="Marca & Identidade Visual" icon={<ImageIcon size={24} />}>
                            <ImageUploader label="Logo do Escritório" currentImage={localBranding.logo} onImageUpload={(b64) => setLocalBranding({ logo: b64 })} onImageRemove={() => setLocalBranding({ logo: '' })} />
                            <button onClick={() => handleSave('branding')} disabled={isSaving} className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 disabled:bg-slate-400 flex items-center">{isSaving && <Loader2 className="animate-spin mr-2" size={16}/>} Salvar Logo</button>
                        </Section>
                        <Section title="Notificações" icon={<Bell size={24} />}>
                            <div>
                                <label htmlFor="deadlineThresholdDays" className="block text-sm font-medium text-slate-700">Alertar sobre prazos com antecedência de (dias)</label>
                                <input type="number" name="deadlineThresholdDays" id="deadlineThresholdDays" value={localNotifications.deadlineThresholdDays} onChange={handleNotificationChange} min="1" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
                            </div>
                            <button onClick={() => handleSave('notifications')} disabled={isSaving} className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 disabled:bg-slate-400 flex items-center">{isSaving && <Loader2 className="animate-spin mr-2" size={16}/>} Salvar Notificações</button>
                        </Section>
                    </div>

                    <div className="space-y-8">
                        <Section title="Personalização do Sistema" icon={<Tag size={24} />}>
                            <div className="space-y-8">
                                <CustomizationList title="Tipos de Ação" items={benefitTypes} onAdd={addBenefitType} onRemove={removeBenefitType} icon={<Type size={18} className="mr-2" />} />
                                <CustomizationList title="Status de Casos" items={caseStatuses} onAdd={addCaseStatus} onRemove={removeCaseStatus} icon={<ListChecks size={18} className="mr-2" />} />
                                <div className="border-t border-slate-200 pt-8 mt-2"><ChecklistManager /></div>
                            </div>
                        </Section>
                        <Section title="Gerenciamento de Dados" icon={<Database size={24} />}>
                            <p>Exporte seus dados para um backup ou resete a aplicação para o estado inicial.</p>
                            <div className="flex gap-4">
                                <button onClick={() => {}} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50">Exportar Dados (JSON)</button>
                                <button onClick={() => setIsResetModalOpen(true)} className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm hover:bg-red-100 flex items-center"><AlertTriangle size={16} className="mr-2"/> Resetar Dados</button>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </>
    );
}
