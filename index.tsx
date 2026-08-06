import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry } from './sentry';

initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento root não encontrado');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);