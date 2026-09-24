import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthGate } from './components/AuthGate';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {import.meta.env.VITE_DATA_MODE === 'rest' ? <App /> : <AuthGate />}
  </React.StrictMode>,
);
