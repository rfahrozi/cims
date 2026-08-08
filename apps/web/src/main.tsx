import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { HearingProvider } from './lib/hearing-context';
import './index.css';

const client = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <HearingProvider>
          <App />
        </HearingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
