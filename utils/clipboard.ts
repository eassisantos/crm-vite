/**
 * Tenta copiar o texto para a área de transferência usando a API Clipboard.
 * Se falhar (por exemplo, em um contexto não seguro), recorre a um método legado
 * usando um textarea temporário.
 * @param text O texto a ser copiado.
 * @param onSuccess Callback executado em caso de sucesso.
 * @param onError Callback executado em caso de falha.
 */
export const copyToClipboard = (
  text: string,
  onSuccess: () => void,
  onError: () => void
) => {
  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Make the textarea invisible and out of the way
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
  
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        onSuccess();
      } else {
        onError();
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
      onError();
    }
  
    document.body.removeChild(textArea);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(err => {
      console.error('Clipboard API failed, falling back.', err);
      fallbackCopy();
    });
  } else {
    fallbackCopy();
  }
};
