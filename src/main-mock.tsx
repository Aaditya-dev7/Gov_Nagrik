// ========================================
// MOCK MODE ENTRY POINT
// Run: npm run dev (then add ?mock=true to URL)
// Or: Open mock.html directly
// ========================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { MockAuthProvider, MockRoleSwitcher } from './contexts/MockAuthContext';
import { MockReportsProvider } from './contexts/MockReportsContext';
import { MainApp } from './components/MainApp';
import './index.css';

// Mock mode is always true for this entry point
function MockApp() {
  return (
    <BrowserRouter basename="/Gov_Nagrik">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MockAuthProvider>
          <MockReportsProvider>
            <div className="min-h-screen bg-background text-foreground">
              <MainApp />
            </div>
            <MockRoleSwitcher />
          </MockReportsProvider>
        </MockAuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MockApp />
  </React.StrictMode>
);
