import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Bell, Key, Info, Copy, Check,
  Building2, Palette, Sun, Moon, Camera, Upload, Trash2, AlertTriangle,
  X, Phone, FileText, CheckCircle2, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  useAppDispatch, useAppSelector, setColorMode, setPalette,
  type ColorPalette
} from '../store';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { key: 'profile', label: 'Profile & Organization', icon: User },
  { key: 'appearance', label: 'Theme & Appearance', icon: Palette },
  { key: 'notifications', label: 'Alert Preferences', icon: Bell },
  { key: 'api', label: 'API Keys & Webhooks', icon: Key },
  { key: 'about', label: 'System & Architecture', icon: Info },
];

const PALETTE_OPTIONS: { id: ColorPalette; name: string; hex: string; bgClass: string; desc: string }[] = [
  { id: 'cyan', name: 'Cyber Cyan (Default)', hex: '#06b6d4', bgClass: 'bg-cyan-500', desc: 'Clinical electric cyan with teal gradient undertones.' },
  { id: 'emerald', name: 'Emerald Matrix', hex: '#10b981', bgClass: 'bg-emerald-500', desc: 'Deep regulatory green with botanical biosafety accents.' },
  { id: 'indigo', name: 'Cyber Indigo', hex: '#6366f1', bgClass: 'bg-indigo-500', desc: 'High-tech AI neural network indigo with deep purple shades.' },
  { id: 'amber', name: 'Amber Solar', hex: '#f59e0b', bgClass: 'bg-amber-500', desc: 'Warm pharmacovigilance alert gold and high-contrast amber.' },
  { id: 'rose', name: 'Crimson Rose', hex: '#f43f5e', bgClass: 'bg-rose-500', desc: 'Dynamic high-priority interdiction crimson and ruby.' },
];

export default function Settings() {
  const { user, profile: authProfile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const colorMode = useAppSelector((state) => state.ui.colorMode);
  const currentPalette = useAppSelector((state) => state.ui.palette);

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['profile', 'appearance', 'notifications', 'api', 'about'].includes(hash) ? hash : 'profile';
  });

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    organization: 'Apollo Health Network',
    role: 'Pharmacist',
    phone: '+91 98765 43210',
    bio: 'Lead Regulatory Pharmacist & Quality Assurance Officer',
    avatarUrl: '',
  });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateConfirmText, setDeactivateConfirmText] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    weeklyDigest: true,
  });
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const mockApiKey = 'mc_verify_sk_7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c';

  useEffect(() => {
    if (authProfile) {
      setProfile({
        name: authProfile.full_name || '',
        email: authProfile.email || user?.email || '',
        organization: authProfile.organization || 'Apollo Health Network',
        role: authProfile.role || 'Pharmacist',
        phone: (authProfile as any).phone || '+91 98765 43210',
        bio: (authProfile as any).bio || 'Lead Regulatory Pharmacist & Quality Assurance Officer',
        avatarUrl: authProfile.avatar_url || '',
      });
    } else if (user) {
      setProfile(p => ({
        ...p,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
      }));
    }
  }, [authProfile, user]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (cancelled) return;
        if (error) {
          if (error.code === 'PGRST116') {
            await supabase.from('user_settings').upsert({ user_id: userId }, { onConflict: 'user_id' });
          }
          return;
        }
        if (data) {
          setNotifications({
            emailAlerts: data.email_alerts ?? true,
            smsAlerts: data.sms_alerts ?? false,
            weeklyDigest: data.weekly_digest ?? true,
          });
          setWebhookUrl(data.webhook_url || '');
        }
      } catch {
        // ignore
      }
    };
    loadSettings();
    return () => { cancelled = true; };
  }, [user?.id]);

  const updateSetting = async (fields: Record<string, unknown>) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...fields }, { onConflict: 'user_id' });
      if (error) {
        toast.error('Failed to save settings: ' + error.message);
      }
    } catch {
      toast.error('Error saving setting');
    }
  };

  // Avatar Upload Handler: Uploads to Supabase Storage and saves URL to profiles table
  const handleAvatarFileChange = async (file: File) => {
    if (!user) {
      toast.error('Please sign in to upload an avatar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB.');
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 1. Upload the raw image file to the Supabase Storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.warn('Storage upload error:', uploadError.message);
        toast.error('Bucket upload failed: ' + uploadError.message);
        return;
      }

      // 2. Retrieve the public storage URL from the bucket
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicBucketUrl = urlData.publicUrl;

      // 3. Save that bucket URL into Supabase Auth User metadata (user.avatar_url)
      await supabase.auth.updateUser({
        data: { avatar_url: publicBucketUrl, picture: publicBucketUrl }
      });

      // 4. Save that bucket URL into public.profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicBucketUrl,
          full_name: profile.name || user.user_metadata?.full_name || '',
          email: user.email || '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        console.warn('Profile table update error:', profileError.message);
      }

      // 5. Update local state and trigger global profile refresh
      setProfile(p => ({ ...p, avatarUrl: publicBucketUrl }));
      await refreshProfile();
      toast.success('Image stored in bucket & saved to user.avatar_url!');
    } catch (err: any) {
      toast.error('Avatar upload error: ' + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      await supabase.auth.updateUser({
        data: { avatar_url: '', picture: '' }
      });
      await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      setProfile(p => ({ ...p, avatarUrl: '' }));
      await refreshProfile();
      toast.success('Avatar removed successfully');
    } catch {
      toast.error('Failed to remove avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveAvatarUrl = async () => {
    if (!avatarInputUrl.trim() || !user) return;
    setAvatarUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarInputUrl.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update avatar URL: ' + error.message);
      } else {
        setProfile(p => ({ ...p, avatarUrl: avatarInputUrl.trim() }));
        await refreshProfile();
        setShowUrlModal(false);
        setAvatarInputUrl('');
        toast.success('Avatar URL saved successfully!');
      }
    } catch {
      toast.error('Failed to save avatar URL');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      return;
    }
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.name,
          email: profile.email,
          organization: profile.organization,
          role: profile.role,
          phone: profile.phone,
          bio: profile.bio,
          avatar_url: profile.avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        toast.error('Failed to update profile: ' + profileError.message);
        return;
      }

      await refreshProfile();
      toast.success('Organization profile & contact details updated!');
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Account Deactivation Handler
  const handleDeactivateAccount = async () => {
    if (deactivateConfirmText !== 'DEACTIVATE' || !user) return;
    setDeactivating(true);
    try {
      // Mark profile as inactive
      await supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      toast.success('Account successfully deactivated. Signing out...');
      setShowDeactivateModal(false);
      await signOut();
      navigate('/');
    } catch (err: any) {
      toast.error('Deactivation error: ' + err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    setApiKeyCopied(true);
    toast.success('API Key copied to clipboard');
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Enterprise Multi-Tenant Node
          </span>
          <span className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
            Org: {profile.organization}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          Settings & Organization Controls
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Manage team member access, profile editions, avatar uploads, color themes, and cryptographic audit ledger settings.
        </p>
      </div>

      {/* Segmented Pill Tabs */}
      <div className="flex p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl gap-1 overflow-x-auto shadow-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsActiveTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl shadow-md shadow-cyan-500/30"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <tab.icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl space-y-8">
        {/* Profile & Organization Tab */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* User Avatar & Identity Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-inner">
              <div className="flex items-center gap-5">
                {/* Interactive Avatar Upload Node */}
                <div className="relative group w-20 h-20 flex-shrink-0">
                  <div className="w-full h-full rounded-full ring-4 ring-cyan-500/40 p-0.5 bg-slate-950 dark:bg-slate-900 shadow-xl overflow-hidden">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white uppercase">
                        {(profile.name || user?.email || 'U').charAt(0)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
                    title="Upload new avatar"
                  >
                    <Camera className="w-5 h-5 text-cyan-300" />
                    <span className="text-[9px] font-bold mt-0.5">Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => e.target.files?.[0] && handleAvatarFileChange(e.target.files[0])}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-xl">{profile.name || 'Enterprise Operator'}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{profile.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="glow-pill-cyan px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider">
                      {profile.role}
                    </span>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="glow-btn-cyan px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{avatarUploading ? 'Uploading to Bucket...' : 'Upload Image to Bucket'}</span>
                    </button>

                    {profile.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={avatarUploading}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowUrlModal(true)}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer px-1 py-1"
                    >
                      <span>Web URL</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <span className="glow-pill-emerald px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Supabase Storage Bucket: <code className="text-cyan-600 dark:text-cyan-300 font-mono font-bold">avatars</code>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {profile.avatarUrl ? 'Image synced to user.avatar_url & profiles table' : 'No custom avatar uploaded yet'}
                </p>
              </div>
            </div>

            {/* Profile Edition Form Fields */}
            <div className="space-y-6">
              <h3 className="font-bold text-white text-base border-b border-slate-700/60 pb-2">
                Edit Profile & Contact Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Dr. Sai Venkatesh"
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Email Address (Auth ID)</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Organization / Health Network</label>
                  <input
                    type="text"
                    value={profile.organization}
                    onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                    placeholder="e.g. Apollo Health Network"
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Operational Role & Permissions</label>
                  <select
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
                  >
                    {['Pharmacist', 'Regulator', 'Manufacturer', 'Hospital Admin', 'Healthcare Provider', 'Consumer'].map((r) => (
                      <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Regulatory Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Professional Title & Credentials
                  </label>
                  <input
                    type="text"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="e.g. Chief Quality Assurance Pharmacist"
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
                  />
                </div>
              </div>

              {/* Save Changes Button */}
              <div className="pt-4 border-t border-slate-700/60 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="glow-btn-cyan px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Danger Zone: Account Deactivation */}
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Danger Zone: Account Deactivation</h3>
                  <p className="text-xs text-rose-300">Permanently deactivate your organization account access and revoke API signing permissions.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-300 max-w-xl">
                  Deactivating disables your node authentication, revokes cryptographic signing keys, and logs an immutable deactivation block in the audit ledger.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-md shadow-rose-600/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Deactivate Account</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Theme & Appearance Tab */}
        {activeTab === 'appearance' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h3 className="font-bold text-white text-lg">Visual Theme & Display Mode</h3>
              <p className="text-xs text-slate-400 mt-0.5">Toggle between High-Contrast Dark and Sunlight Light modes.</p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => dispatch(setColorMode('dark'))}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  colorMode === 'dark'
                    ? 'bg-slate-900 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  {colorMode === 'dark' && <Check className="w-5 h-5 text-cyan-400" />}
                </div>
                <h4 className="font-bold text-white text-base">High-Contrast Cyber Dark</h4>
                <p className="text-xs text-slate-400 mt-1">Deep midnight background with glowing neon accents and glassmorphism.</p>
              </div>

              <div
                onClick={() => dispatch(setColorMode('light'))}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  colorMode === 'light'
                    ? 'bg-white text-slate-900 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </div>
                  {colorMode === 'light' && <Check className="w-5 h-5 text-amber-500" />}
                </div>
                <h4 className="font-bold text-slate-900 text-base">Clean Clinical Light</h4>
                <p className="text-xs text-slate-500 mt-1">Crisp high-readability daylight layout with soft ambient shadows.</p>
              </div>
            </div>

            {/* Brand Color Palette Selector */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Brand Accent Color Palette</h3>
                <p className="text-xs text-slate-400 mt-0.5">Customize the primary glowing CTA, badge, and aura highlights across the whole platform.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PALETTE_OPTIONS.map((pal) => {
                  const isSelected = currentPalette === pal.id;
                  return (
                    <div
                      key={pal.id}
                      onClick={() => {
                        dispatch(setPalette(pal.id));
                        toast.success(`Theme palette changed to ${pal.name}`);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-white/10 border-white/40 shadow-lg'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full ${pal.bgClass} shadow-md`} />
                          <span className="font-bold text-white text-xs">{pal.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{pal.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h3 className="font-bold text-white text-lg">Alert & Notification Channels</h3>
            <div className="space-y-4">
              {[
                { key: 'emailAlerts', title: 'Counterfeit Interception Email Alerts', desc: 'Instant email dispatches whenever a scanned batch receives a COUNTERFEIT verdict.' },
                { key: 'smsAlerts', title: 'SMS Critical Recalls', desc: 'Emergency SMS alerts for Class I CDSCO drug recall notices and hot supply chain anomalies.' },
                { key: 'weeklyDigest', title: 'Weekly Pharmacovigilance Digest', desc: 'Weekly summary of verified lots, threat levels, and pending review queue items.' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-cyan-500/30 transition-colors">
                  <div>
                    <p className="font-bold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[item.key as keyof typeof notifications]}
                    onChange={(e) => {
                      const updated = { ...notifications, [item.key]: e.target.checked };
                      setNotifications(updated);
                      updateSetting({ [item.key === 'emailAlerts' ? 'email_alerts' : item.key === 'smsAlerts' ? 'sms_alerts' : 'weekly_digest']: e.target.checked });
                      toast.success('Preference updated');
                    }}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* API & Webhooks Tab */}
        {activeTab === 'api' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h3 className="font-bold text-white text-lg">Developer API & Webhooks</h3>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Production API Key (Node Scope)</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={mockApiKey}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 font-mono text-xs text-cyan-300"
                />
                <button
                  onClick={copyApiKey}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {apiKeyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{apiKeyCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Webhook Dispatch Endpoint</label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hospital-network.org/api/webhooks/medichain"
                  className="flex-1 px-4 py-3 rounded-xl glass-input text-sm"
                />
                <button
                  onClick={() => { updateSetting({ webhook_url: webhookUrl }); toast.success('Webhook endpoint saved'); }}
                  className="glow-btn-cyan px-5 py-3 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Webhook
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">Continuous SHA-256 Hash Chaining</p>
                <p className="text-xs text-slate-400 mt-0.5">Append-only cryptographic blocks recorded on every verification appraisal.</p>
              </div>
              <span className="glow-pill-emerald px-3 py-1 rounded-full text-xs font-bold">
                Enforced
              </span>
            </div>
          </motion.div>
        )}

        {/* About Architecture Tab */}
        {activeTab === 'about' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h3 className="font-bold text-white text-lg">MediChain Verify Enterprise Architecture</h3>
            <div className="space-y-3 divide-y divide-slate-700/40">
              {[
                ['Architecture Version', 'v2.0.0 (Enterprise Architecture Edition)'],
                ['AI Pipeline', '6-Agent Domain Architecture with Content Safety Guardrails'],
                ['Inference Engine', 'Gemini 3.6 Flash & OpenRouter Free Tier (NVIDIA Nemotron, Gemma 4, GLM 5.2)'],
                ['Audit Ledger', 'Cryptographic SHA-256 Hash Chain (Append-Only PostgreSQL)'],
                ['Regulatory Framework', 'CDSCO (Drugs & Cosmetics Act 1940) + OpenFDA API'],
                ['Human Governance', 'Mandatory Review Queue Sign-off for Regulatory Form 19'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between pt-3 text-xs sm:text-sm">
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="font-bold text-cyan-300 text-right font-mono">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal: External Avatar URL */}
      <AnimatePresence>
        {showUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base">Paste Avatar Image URL</h3>
                <button onClick={() => setShowUrlModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">Image Web URL (HTTPS)</label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarInputUrl}
                  onChange={(e) => setAvatarInputUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={avatarUploading || !avatarInputUrl.trim()}
                  onClick={handleSaveAvatarUrl}
                  className="glow-btn-cyan px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  {avatarUploading ? 'Saving...' : 'Save Avatar URL'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Account Deactivation Confirmation */}
      <AnimatePresence>
        {showDeactivateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/40 space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Confirm Account Deactivation</h3>
                  <p className="text-[11px] text-rose-400">Irreversible operational action</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to deactivate your MediChain Verify account? Your user profile status will be set to <strong className="text-rose-400 font-bold">inactive</strong> and your active session will be terminated immediately.
              </p>

              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Type <span className="text-rose-400 font-mono">DEACTIVATE</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="DEACTIVATE"
                  value={deactivateConfirmText}
                  onChange={(e) => setDeactivateConfirmText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateConfirmText('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deactivateConfirmText !== 'DEACTIVATE' || deactivating}
                  onClick={handleDeactivateAccount}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40 shadow-lg shadow-rose-600/30"
                >
                  {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
