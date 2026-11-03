import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioProvider } from './store/studio';
import { App } from './App';
import './styles/base.css';
import './styles/views.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioProvider>
      <App />
    </StudioProvider>
  </React.StrictMode>,
);
