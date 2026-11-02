/**
 * OCC - Object Control Center
 * Configuração global dos testes de frontend (Vitest + Testing Library).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
