import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard', { replace: true });
        } else {
          // Listen for auth state change after hash/code exchange
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if (s || event === 'SIGNED_IN') {
              subscription.unsubscribe();
              navigate('/dashboard', { replace: true });
            }
          });

          // Timeout after 3 seconds to fallback to login or dashboard
          setTimeout(() => {
            subscription.unsubscribe();
            navigate('/dashboard', { replace: true });
          }, 3000);
        }
      } catch (err) {
        console.error('[AuthCallback] Error processing session:', err);
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      <p className="text-sm text-slate-400 font-mono">Authenticating and verifying credentials...</p>
    </div>
  );
}
