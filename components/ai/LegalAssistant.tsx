
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Link as LinkIcon, AlertTriangle, Info } from 'lucide-react';
import { streamChatResponse, isGeminiAvailable } from '../../services/geminiService';
import { renderSafeRichText } from '../../utils/sanitize';
import { ChatMessage } from '../../types';

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
    "Resumir um caso com base em notas",
    "Pesquisar jurisprudência sobre...",
    "Rascunhar um email para o cliente",
];

export default function LegalAssistant() {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

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
    <div className="flex h-[70vh] flex-col rounded-xl bg-white shadow-sm">
      <div className="flex items-center border-b p-4">
        <Sparkles className="h-6 w-6 text-sky-500" />
        <h2 className="ml-3 text-lg font-semibold text-slate-800">Assistente Jurídico AI</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!isAssistantAvailable && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Info size={16} />
            </div>
            <p>
              Os recursos de IA estão desativados porque a variável de ambiente <strong>VITE_AI_PROXY_URL</strong> não foi definida. Configure o proxy seguro (VITE_AI_PROXY_URL) para habilitar o assistente.
            </p>
          </div>
        )}
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                  <Sparkles size={16} />
                </div>
              )}
              <div className={`max-w-xl rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {msg.text ? <FormattedMessage text={msg.text} /> : <TypingIndicator />}
              </div>
            </div>
            {index === 0 && isAssistantAvailable && (
                <div className="pt-2 pb-4">
                    <p className="text-xs text-slate-500 mb-2">Ou tente um destes exemplos:</p>
                    <div className="flex flex-wrap gap-2">
                        {promptStarters.map((prompt) => (
                            <button
                                key={prompt}
                                onClick={() => setInput(prompt)}
                                className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full hover:bg-sky-100 hover:text-sky-700 transition-colors"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </React.Fragment>
        ))}
        {currentSources.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <LinkIcon size={16} />
            </div>
            <div className="max-w-xl rounded-lg bg-slate-50 p-3">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Fontes da Web:</h4>
              <ul className="space-y-1">
                {currentSources.map((source, index) => (
                  <li key={index}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline truncate block" title={source.title}>
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
        <div className="border-t p-4 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo ao JurisAI..."
            className="w-full rounded-full border-slate-300 bg-slate-100 py-2 pl-4 pr-12 text-sm focus:border-sky-500 focus:ring-sky-500"
            disabled={isLoading || !isAssistantAvailable}
            aria-label="Mensagem para o assistente"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !isAssistantAvailable}
            className="absolute inset-y-0 right-0 flex h-full w-10 items-center justify-center rounded-full text-slate-500 transition-colors disabled:cursor-not-allowed disabled:text-slate-300 hover:enabled:text-sky-600"
            aria-label="Enviar mensagem"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
