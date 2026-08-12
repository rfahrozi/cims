import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './app';
import { HearingProvider } from './lib/hearing-context';
import './index.css';

const client = new QueryClient();
const base = import.meta.env.MODE === 'production' ? '/cims' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter basename={base}>
        <HearingProvider>
          <App />
        </HearingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
