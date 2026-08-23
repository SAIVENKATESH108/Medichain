import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  // Keep ref in sync so callbacks always see latest user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchProfile = useCallback(async (userId: string, authUser?: User | null) => {
    try {
      console.log('[Auth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile row doesn't exist — create it from auth user metadata.
        console.log('[Auth] Profile not found, auto-creating...');
        const u = authUser ?? userRef.current;
        const meta = u?.user_metadata ?? {};
        const emailLower = (u?.email || '').toLowerCase();
        let determinedRole = 'Consumer';
        if (emailLower.includes('admin') || meta.role === 'admin') determinedRole = 'Admin';
        else if (emailLower.includes('inspector') || emailLower.includes('regulator') || meta.role === 'regulator') determinedRole = 'Regulator';
        else if (emailLower.includes('pharmacist') || meta.role === 'pharmacist') determinedRole = 'Pharmacist';

        const newProfile = {
          id: userId,
          full_name: meta.full_name || meta.name || (determinedRole === 'Admin' ? 'System Administrator' : determinedRole === 'Regulator' ? 'Inspector Ananya Roy, CDSCO' : determinedRole === 'Pharmacist' ? 'Dr. Rajesh Sharma, Reg. Pharmacist' : ''),
          email: u?.email || '',
          avatar_url: meta.avatar_url || meta.picture || '',
          organization: determinedRole === 'Regulator' ? 'CDSCO Central Drugs Control' : determinedRole === 'Pharmacist' ? 'Apollo Healthcare Pharmacy' : 'MediChain Enterprise Node',
          role: determinedRole,
        };
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' })
          .select()
          .single();
        if (insertErr) {
          console.warn('[Auth] Profile auto-create failed:', insertErr.message);
          if (insertErr.code === '42P01') {
            setAuthError('Database tables not found. Please run migration.sql in Supabase SQL Editor.');
          }
        } else if (created) {
          console.log('[Auth] ✅ Profile created successfully');
          setProfile(created);
        }
        // Also ensure user_settings row exists
        await supabase
          .from('user_settings')
          .upsert({ user_id: userId }, { onConflict: 'user_id' });
        return;
      }

      if (error) {
        console.warn('[Auth] Profile fetch error:', error.message, error.code);
        if (error.code === '42P01') {
          setAuthError('Database tables not found. Please run migration.sql in Supabase SQL Editor.');
        }
        return;
      }

      // If profile exists but avatar_url is empty, backfill from auth metadata
      if (data) {
        const u = authUser ?? userRef.current;
        const meta = u?.user_metadata ?? {};
        if (!data.avatar_url && (meta.avatar_url || meta.picture)) {
          const avatarUrl = meta.avatar_url || meta.picture;
          data.avatar_url = avatarUrl;
          supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId)
            .then(({ error: updateErr }) => {
              if (updateErr) console.warn('[Auth] Avatar backfill failed:', updateErr.message);
            });
        }
        console.log('[Auth] ✅ Profile loaded:', data.email);
        setProfile(data);
      }
    } catch (err) {
      console.warn('[Auth] Profile fetch failed:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser) await fetchProfile(currentUser.id);
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let initialDone = false;

    console.log('[Auth] Initializing auth state listener...');

    const timeout = setTimeout(() => {
      if (mounted && loading && !initialDone) {
        // Only warn if we truly got no auth event at all
        const currentUser = userRef.current;
        if (currentUser) {
          console.log('[Auth] Timeout reached but user is set — finishing init');
        } else {
          console.warn(
            '%c[Auth] ⚠️ No auth session found (timeout)',
            'color: orange; font-weight: bold',
            '\nPlease sign up or sign in to use the app.'
          );
        }
        setLoading(false);
      }
    }, 5000);

    // Set up the auth state listener.
    // CRITICAL: Do NOT await fetchProfile here — it blocks the callback
    // and causes the timeout to fire before loading completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!mounted) return;

        console.log(
          `%c[Auth] State change: ${event}`,
          'color: blue; font-weight: bold',
          s ? `(user: ${s.user?.email})` : '(no session)'
        );

        setSession(s);
        const u = s?.user ?? null;
        setUser(u);
        userRef.current = u;
        setAuthError(null);

        // Mark init as done and stop loading IMMEDIATELY
        // Don't wait for profile fetch — it's non-critical for page rendering
        initialDone = true;
        setLoading(false);

        // Fetch profile in the BACKGROUND (don't block auth state)
        if (u) {
          fetchProfile(u.id, u);
        } else {
          setProfile(null);
        }
      }
    );

    // Fallback: if onAuthStateChange doesn't fire within 2s, manually get session
    const fallback = setTimeout(async () => {
      if (!mounted || initialDone) return;
      console.log('[Auth] Fallback: manually checking session...');
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted || initialDone) return;
        console.log(
          '[Auth] Fallback result:',
          s ? `session found (${s.user?.email})` : 'no session'
        );
        setSession(s);
        const u = s?.user ?? null;
        setUser(u);
        userRef.current = u;
        if (u) {
          fetchProfile(u.id, u);
        }
      } catch (err) {
        console.warn('[Auth] Fallback getSession failed:', err);
      } finally {
        if (mounted) {
          initialDone = true;
          setLoading(false);
        }
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    console.log('[Auth] Signing in with Google...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      console.error('[Auth] Google sign-in error:', error.message);
      setAuthError(error.message);
    }
  }, []);

  const signInWithGithub = useCallback(async () => {
    console.log('[Auth] Signing in with GitHub...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      console.error('[Auth] GitHub sign-in error:', error.message);
      setAuthError(error.message);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing in with email:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] Email sign-in error:', error.message);

      // Seamless auto-fallback for Quick Demo credentials
      const emailLower = email.toLowerCase();
      const isDemo = emailLower.includes('pharmacist@medichain') || emailLower.includes('inspector@cdsco') || emailLower.includes('admin@medichain');
      if (isDemo && (error.message.includes('Invalid login') || error.message.includes('credentials') || error.message.includes('not found'))) {
        console.log('[Auth] Attempting auto-registration for demo evaluator account:', email);
        const role = emailLower.includes('admin') ? 'admin' : emailLower.includes('inspector') ? 'regulator' : 'pharmacist';
        const name = emailLower.includes('admin') ? 'System Administrator' : emailLower.includes('inspector') ? 'Inspector Ananya Roy, CDSCO' : 'Dr. Rajesh Sharma, Reg. Pharmacist';

        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role } }
        });

        if (!signUpErr && (signUpData.session || signUpData.user)) {
          console.log('[Auth] ✅ Demo account auto-registered successfully');
          return { error: null };
        }
      }

      let friendlyMsg = error.message;
      if (error.message === 'Invalid login credentials') {
        friendlyMsg = 'Invalid email or password. Please check your credentials or click a demo role chip below.';
      }
      return { error: friendlyMsg };
    }
    console.log('[Auth] ✅ Email sign-in successful');
    return { error: null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    console.log('[Auth] Signing up with email:', email);
    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: callbackUrl,
      },
    });
    if (error) {
      console.error('[Auth] Email sign-up error:', error.message, error.status);
      let friendlyMsg = error.message;
      if (error.message.includes('email_address_invalid') || error.message.includes('is invalid')) {
        friendlyMsg = `Email signup rejected by Supabase. This is usually a project configuration issue.\n\nPlease go to Supabase Dashboard → Authentication → Providers → Email and:\n1. Make sure "Enable Email provider" is ON\n2. Try disabling "Confirm email" for development\n\nOriginal error: ${error.message}`;
      } else if (error.message.includes('rate limit')) {
        friendlyMsg = 'Too many signup attempts. Please wait a minute and try again.';
      } else if (error.message.includes('already registered')) {
        friendlyMsg = 'This email is already registered. Please sign in instead.';
      }
      return { error: friendlyMsg };
    }
    if (data.user && !data.session) {
      console.log('[Auth] ✅ Signup successful — email confirmation required');
      return { error: null };
    }
    if (data.session) {
      console.log('[Auth] ✅ Signup successful — auto-signed in');
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Auth] Sign out error:', err);
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    userRef.current = null;
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, authError,
      signInWithGoogle, signInWithGithub,
      signInWithEmail, signUpWithEmail,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
