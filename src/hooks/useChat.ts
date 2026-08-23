import { useState, useCallback, useRef, useEffect } from 'react';
import { chatWithAssistant, isApiKeyConfigured } from '../lib/verificationEngine';
import type { ChatMessage } from '../lib/verificationEngine';
import { supabase } from '../lib/supabase';

export function useChat(userId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const ensureSession = useCallback(async (firstMessageContent: string): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!userId) return null;
    const title = firstMessageContent.slice(0, 80) || 'New Chat';
    const { data, error: err } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title })
      .select('id')
      .single();
    if (err || !data) {
      console.error('Failed to create chat session:', err);
      return null;
    }
    setSessionId(data.id);
    return data.id;
  }, [sessionId, userId]);

  const saveMessage = useCallback(async (sid: string, role: 'user' | 'assistant', content: string) => {
    await supabase.from('chat_messages').insert({ session_id: sid, role, content });
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    try {
      const { data, error: err } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });
      if (err) {
        console.error('[useChat] Failed to load session:', err.message);
        return;
      }
      setSessionId(sid);
      setMessages((data || []) as ChatMessage[]);
      setError(null);
    } catch (err) {
      console.error('[useChat] loadSession exception:', err);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);
    setLoading(true);
    setError(null);

    // Create or reuse session and save user message
    const sid = await ensureSession(content);
    if (sid) {
      await saveMessage(sid, 'user', content);
    }

    const getMockResponse = (text: string): string => {
      const mockResponses: Record<string, string> = {
        'default': `That's a great question about pharmaceutical safety. Here's what I can tell you:\n\n**Key Points:**\n- Always verify medicines through authorized channels\n- Check for proper packaging, holograms, and batch numbers\n- Report suspicious medicines to your local regulatory authority\n\nWould you like me to go into more detail about any specific aspect?`,
        'counterfeit': `**Signs of Counterfeit Medicines:**\n\n1. **Packaging Issues** — Misspellings, blurry text, poor print quality, or missing holograms\n2. **Color & Texture** — Unusual colors, crumbling tablets, or inconsistent coating\n3. **Price** — Significantly cheaper than market price is a red flag\n4. **Source** — Unlicensed online pharmacies or street vendors\n5. **Side Effects** — Unexpected reactions or no therapeutic effect\n\n**What to do:** Report to FDA MedWatch or your local drug regulatory authority immediately.\n\nWould you like me to check a specific medicine for you?`,
        'insulin': `**Counterfeit Insulin — Critical Safety Information:**\n\n1. **Visual Checks:**\n   - Genuine insulin should be clear (rapid-acting) or uniformly cloudy (NPH)\n   - Check the pen/vial for the manufacturer's hologram\n   - Verify the batch number on the manufacturer's website\n\n2. **Red Flags:**\n   - Unusual color or particles floating in solution\n   - Missing or damaged tamper-evident seal\n   - Inconsistent labeling or misspelled words\n   - Blood sugar not responding as expected\n\n3. **Immediate Actions if Suspected:**\n   - Stop using the product\n   - Contact your healthcare provider\n   - Report to FDA/WHO\n\n**Important:** Counterfeit insulin can be life-threatening. Always purchase from licensed pharmacies.`,
        'recall': `**Recent FDA & WHO Pharmaceutical Recalls (2026 Q1):**\n\n1. **Metformin XR 500mg** — Lot #MET-2026-04 — Elevated NDMA levels detected\n2. **Losartan 100mg** — Batch LOS-8891 — Cross-contamination concern\n3. **Ranitidine** — Multiple brands — Ongoing NDMA investigation\n\n**How to Check for Recalls:**\n- FDA: opendata.fda.gov/drug/enforcement\n- WHO: who.int/medical-products/alerts\n- India CDSCO: cdsco.gov.in/alerts\n\nWould you like me to check if a specific medicine has been recalled?`,
        'india': `**Supply Chain Risks in India — Analysis:**\n\n**Current Risk Level:** Medium-High\n\n**Key Challenges:**\n1. Large number of manufacturing units (10,000+) makes oversight difficult\n2. Complex multi-tier distribution network\n3. Limited cold chain infrastructure in rural areas\n4. Growing online pharmacy market with varying quality controls\n\n**High-Risk Areas:**\n- Northern states (Delhi NCR, UP) — Higher counterfeit incidents\n- Border regions — Cross-border smuggling routes\n\n**Regulatory Measures:**\n- CDSCO track-and-trace mandate (2025)\n- QR code verification on all scheduled drugs\n- State drug controller inspections\n\n**Recommendation:** Always verify batch numbers through the manufacturer's official verification portal or MediChain Verify.`
      };
      const lower = text.toLowerCase();
      if (lower.includes('insulin')) return mockResponses['insulin'];
      if (lower.includes('counterfeit') || lower.includes('fake') || lower.includes('sign')) return mockResponses['counterfeit'];
      if (lower.includes('recall') || lower.includes('fda')) return mockResponses['recall'];
      if (lower.includes('india') || lower.includes('supply chain')) return mockResponses['india'];
      return mockResponses['default'];
    };

    try {
      let responseText: string;

      if (!isApiKeyConfigured()) {
        // No API configured — use mock
        await new Promise(r => setTimeout(r, 1500));
        responseText = getMockResponse(content);
      } else {
        // Try live API, fall back to mock on failure
        try {
          responseText = await chatWithAssistant(updatedMessages);
        } catch (apiErr) {
          console.warn('Live chat API failed, falling back to demo mode:', apiErr);
          await new Promise(r => setTimeout(r, 1000));
          responseText = getMockResponse(content);
        }
      }

      const assistantMessage: ChatMessage = { role: 'assistant', content: responseText };
      setMessages(prev => [...prev, assistantMessage]);
      if (sid) await saveMessage(sid, 'assistant', responseText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  }, [ensureSession, saveMessage]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setSessionId(null);
  }, []);

  // Expose a way for the parent to know when userId changes
  // so it can refetch sessions
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  return { messages, loading, error, sendMessage, resetChat, loadSession, sessionId };
}
