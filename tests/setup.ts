import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock import.meta.env defaults
vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');
vi.stubEnv('VITE_GROQ_ENABLED', 'false');
