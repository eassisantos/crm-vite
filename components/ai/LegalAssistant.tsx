
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Send, Loader2, Link as LinkIcon, AlertTriangle, Info, History } from 'lucide-react';
import { streamChatResponse, isGeminiAvailable } from '../../services/geminiService';
import { renderSafeRichText } from '../../utils/sanitize';
import { ChatMessage, FeeStatus } from '../../types';
import { useCases } from '../../context/CasesContext';
import { useClients } from '../../context/ClientsContext';
import { useFinancial } from '../../context/FinancialContext';

const TypingIndicator = () => (
  <div className="flex items-center space-x-1">
    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"></span>
    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"></span>
    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
  </div>
);

const FormattedMessage = ({ text }: { text: string }) => {
  const html = renderSafeRichText(text);
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
};

const promptStarters = [
  'Resumir um caso com base em notas',
  'Pesquisar jurisprudência sobre...',
  'Rascunhar um email para o cliente',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const parseDate = (value: string) => new Date(value.includes('T') ? value : `${value}T00:00:00`);

export default function LegalAssistant() {
  const { cases } = useCases();
  const { clients } = useClients();
  const { fees } = useFinancial();
  const isAssistantAvailable = isGeminiAvailable;
  const assistantGreeting = isAssistantAvailable
    ? 'Olá! Sou o JurisAI, seu assistente jurídico. Como posso ajudar hoje? Posso resumir um caso, pesquisar jurisprudência ou redigir um rascunho de documento.'
    : 'Olá! O JurisAI está temporariamente indisponível porque a integração com IA não está configurada. Informe a URL do proxy VITE_AI_PROXY_URL para habilitar esta funcionalidade.';
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: assistantGreeting }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSources, setCurrentSources] = useState<any[]>([]);

  const suggestionPrompts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const suggestions: { title: string; description: string; prompt: string }[] = [];
    const caseMap = new Map(cases.map(caseItem => [caseItem.id, caseItem]));
    const clientMap = new Map(clients.map(client => [client.id, client]));

    const upcomingTasks = cases
      .flatMap(caseItem => caseItem.tasks.map(task => ({ task, caseItem })))
      .filter(item => !item.task.completed && parseDate(item.task.dueDate) >= today)
      .sort((a, b) => parseDate(a.task.dueDate).getTime() - parseDate(b.task.dueDate).getTime());

    if (upcomingTasks[0]) {
      const { task, caseItem } = upcomingTasks[0];
      const dueDate = parseDate(task.dueDate);
      const clientName = clientMap.get(caseItem.clientId)?.name;
      suggestions.push({
        title: 'Preparar próxima tarefa',
        description: `${caseItem.title} • ${dueDate.toLocaleDateString('pt-BR')}`,
        prompt: `Ajude-me a planejar a tarefa "${task.description}" do caso "${caseItem.title}"${
          clientName ? ` do cliente ${clientName}` : ''
        }. Liste passos objetivos considerando o prazo em ${dueDate.toLocaleDateString('pt-BR')}.`,
      });
    }

    const pendingFee = fees
      .filter(fee => fee.status !== FeeStatus.PAGO)
      .sort((a, b) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime())[0];

    if (pendingFee) {
      const relatedCase = caseMap.get(pendingFee.caseId);
      const clientName = relatedCase ? clientMap.get(relatedCase.clientId)?.name : undefined;
      const dueDate = parseDate(pendingFee.dueDate);
      suggestions.push({
        title: 'Cobrança inteligente',
        description: `${relatedCase?.title ?? 'Caso'} • vence em ${dueDate.toLocaleDateString('pt-BR')}`,
        prompt: `Elabore uma mensagem cordial lembrando${clientName ? ` ${clientName}` : ''} sobre o honorário de ${formatCurrency(
          pendingFee.amount,
        )} referente ao caso "${relatedCase?.title ?? 'Sem título'}" com vencimento em ${dueDate.toLocaleDateString('pt-BR')}.`,
      });
    }

    const recentCase = [...cases].sort(
      (a, b) => parseDate(b.lastUpdate).getTime() - parseDate(a.lastUpdate).getTime(),
    )[0];
    if (recentCase) {
      const clientName = clientMap.get(recentCase.clientId)?.name;
      suggestions.push({
        title: 'Resumo estratégico',
        description: `${recentCase.title}${clientName ? ` • ${clientName}` : ''}`,
        prompt: `Resuma os próximos passos estratégicos para o caso "${recentCase.title}"${
          clientName ? ` do cliente ${clientName}` : ''
        }, destacando riscos e oportunidades prioritárias para a próxima semana.`,
      });
    }

    return suggestions.slice(0, 3);
  }, [cases, clients, fees]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const recentUserMessages = useMemo(
    () => messages.filter(message => message.role === 'user').slice(-4).reverse(),
    [messages],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAssistantAvailable) {
      setError('O assistente de IA está indisponível no momento. Configure a URL do proxy VITE_AI_PROXY_URL para utilizar este recurso.');
      return;
    }
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setCurrentSources([]);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

    try {
      await streamChatResponse(
        input,
        (chunk) => {
          setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: chunk } : msg));
        },
        (sources) => {
          setCurrentSources(sources);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-sky-500" />
          <h2 className="text-lg font-semibold text-slate-800">Assistente Jurídico AI</h2>
        </div>
        {isAssistantAvailable && (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">Online</span>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {!isAssistantAvailable && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Info size={16} />
            </div>
            <p>
              Os recursos de IA estão desativados porque a variável de ambiente <strong>VITE_AI_PROXY_URL</strong> não foi definida. Configure o proxy seguro (VITE_AI_PROXY_URL) para habilitar o assistente.
            </p>
          </div>
        )}

        {isAssistantAvailable && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Sparkles size={14} className="text-sky-500" />
              Sugestões automáticas
            </div>
            {suggestionPrompts.length > 0 ? (
              <div className="mt-3 space-y-3">
                {suggestionPrompts.map(suggestion => (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => setInput(suggestion.prompt)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <p className="font-semibold text-slate-800">{suggestion.title}</p>
                    <p className="text-xs text-slate-500">{suggestion.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Sem sugestões automáticas no momento. Explore os atalhos abaixo.</p>
            )}
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Comece com um clique</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {promptStarters.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-sky-100 hover:text-sky-700"
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {recentUserMessages.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <History size={14} />
              Histórico recente
            </div>
            <div className="mt-3 space-y-2">
              {recentUserMessages.map(message => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setInput(message.text)}
                  className="w-full truncate rounded-lg bg-slate-100 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
                >
                  {message.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                <Sparkles size={16} />
              </div>
            )}
            <div
              className={`max-w-xl rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {msg.text ? <FormattedMessage text={msg.text} /> : <TypingIndicator />}
            </div>
          </div>
        ))}

        {currentSources.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <LinkIcon size={16} />
            </div>
            <div className="max-w-xl">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Fontes da Web</h4>
              <ul className="space-y-1 text-xs">
                {currentSources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sky-600 hover:underline"
                      title={source.title}
                    >
                      {index + 1}. {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="flex items-center gap-2 border-t px-5 py-3 text-sm text-red-600">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="border-t px-5 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Pergunte algo ao JurisAI..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-12 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            disabled={isLoading || !isAssistantAvailable}
            aria-label="Mensagem para o assistente"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !isAssistantAvailable}
            className="absolute inset-y-0 right-0 flex h-full w-11 items-center justify-center rounded-full text-slate-500 transition-colors disabled:cursor-not-allowed disabled:text-slate-300 hover:enabled:text-sky-600"
            aria-label="Enviar mensagem"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
