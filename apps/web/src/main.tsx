import './desktopConfig';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import { App } from './App';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import './index.css';
import './styles/ui.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
);
