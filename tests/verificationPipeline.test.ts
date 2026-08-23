import { isApiKeyConfigured } from '../src/lib/verificationEngine';

describe('Verification Pipeline Fallback & Simulation Invariants', () => {
  it('reports isApiKeyConfigured as true when Gemini or OpenRouter key is provided', () => {
    expect(isApiKeyConfigured()).toBe(true);
  });
});
