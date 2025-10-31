import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração global do worker do PDF.js para garantir a compatibilidade em ambientes de sandbox e Vite.
// Isso é feito aqui para garantir que seja executado apenas uma vez no início da aplicação.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.178/build/pdf.worker.js`;

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}
