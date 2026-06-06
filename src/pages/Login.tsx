import React, { useState } from 'react';
import { useAuth } from '../authContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { 
  Waves, 
  ShieldCheck, 
  User as UserIcon, 
  Briefcase, 
  Mail, 
  Lock, 
  ArrowLeft, 
  CircleAlert, 
  CheckCircle2, 
  Loader2,
  MessageSquare,
  KeyRound,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../languageContext';
import LanguageToggle from '../components/LanguageToggle';

type Step = 'role' | 'login' | 'forgot-password' | 'verify-code' | 'reset-password' | 'reset-success' | 'pending-info';
type Role = 'admin' | 'staff' | 'direktur';

export default function Login() {
  const { user, login, verifyCode, sendPasswordReset, confirmNewPassword, logout } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<Role>('admin');
  const [step, setStep] = useState<Step>('role');
  
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vCode, setVCode] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Clear any stale session when landing on login page
  React.useEffect(() => {
    logout();
  }, []);

  React.useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    if (mode === 'resetPassword' && oobCode) {
      setStep('reset-password');
      setVCode(oobCode);
    }
  }, [searchParams]);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  if (loginSuccess && user && step !== 'role') {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    if (user.role === 'direktur') return <Navigate to="/accounting" replace />;
    return <Navigate to="/login" replace />;
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (step === 'login') {
        const result = await login(emailOrPhone, password, selectedRole);
        if (result.success) {
          setLoginSuccess(true);
        } else {
          if (result.message === 'PENDING_VERIFICATION') {
            setStep('pending-info');
          } else if (result.message === 'Account blocked') {
            setError(t('login.error.blocked'));
          } else {
            setError(result.message || 'Login failed');
          }
        }
      } else if (step === 'verify-code') {
        const result = await verifyCode(emailOrPhone, vCode);
        if (!result.success) {
          setError(result.message || 'Verification failed');
        }
      } else if (step === 'forgot-password') {
        const result = await sendPasswordReset(emailOrPhone);
        if (result.success) {
          alert(t('login.reset.email_sent'));
          setStep('login');
        } else {
          setError(result.message || 'Failed to send reset email');
        }
      } else if (step === 'reset-password') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const result = await confirmNewPassword(vCode, password);
        if (result.success) {
          setStep('reset-success');
        } else {
          setError(result.message || 'Failed to update password');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: Role) => role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00478d]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#4b6175]/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="absolute top-8 right-8 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 'role' ? (
            <motion.div 
              key="role"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 flex items-center justify-center mb-4">
                  <img src="/logo-pdam.png" alt="Logo PDAM" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <h1 className="text-2xl font-headline font-bold text-slate-800">{t('login.gate.title')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('login.gate.subtitle')}</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => { setSelectedRole('admin'); setStep('login'); }} className="group flex items-center p-5 rounded-2xl border-2 border-slate-100 hover:border-primary/50 transition-all bg-white">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                      <ShieldCheck size={24} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-slate-800">{t('login.role.admin.title')}</span>
                      <span className="text-xs text-slate-500">{t('login.role.admin.desc')}</span>
                    </div>
                  </button>
                  <button onClick={() => { setSelectedRole('staff'); setStep('login'); }} className="group flex items-center p-5 rounded-2xl border-2 border-slate-100 hover:border-primary/50 transition-all bg-white">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                      <Briefcase size={24} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-slate-800">{t('login.role.staff.title')}</span>
                      <span className="text-xs text-slate-500">{t('login.role.staff.desc')}</span>
                    </div>
                  </button>
                  <button onClick={() => { setSelectedRole('direktur'); setStep('login'); }} className="group flex items-center p-5 rounded-2xl border-2 border-slate-100 hover:border-primary/50 transition-all bg-white">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                      <UserIcon size={24} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-slate-800">Direktur</span>
                      <span className="text-xs text-slate-500">Akses Akuntansi</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 'verify-code' ? (
            <motion.div 
               key="verify"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50"
            >
              <button onClick={() => setStep('role')} className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft size={16} className="mr-2" />
                {t('common.back')}
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{t('login.verify.title')}</h2>
                <p className="text-slate-500 text-sm mt-2">
                  {t('login.verify.subtitle')}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <CircleAlert size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={vCode}
                    onChange={(e) => setVCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="block w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-primary/20 focus:border-[#00478d] outline-none transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || vCode.length !== 6}
                  className="w-full py-4 bg-[#00478d] text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('login.verify.button')}
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-slate-400">
                {t('login.verify.footer')}
              </p>
            </motion.div>
          ) : step === 'reset-password' ? (
            <motion.div 
               key="reset"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{t('login.reset.new_password')}</h2>
                <p className="text-slate-500 text-sm mt-2">
                  {t('login.reset.subtitle')}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <CircleAlert size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">{t('login.label.password')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#00478d] text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('login.reset.confirm_button')}
                </button>
              </form>
            </motion.div>
          ) : step === 'pending-info' ? (
            <motion.div 
               key="pending"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-10 border border-white/50 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-amber-50 group-hover:scale-110 transition-transform">
                <Clock size={40} />
              </div>
              <h2 className="text-3xl font-headline font-bold text-slate-800 mb-4">{t('login.pending.title')}</h2>
              <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100 mb-10">
                <p className="text-slate-600 font-medium leading-relaxed">
                  {t('login.pending.subtitle')}
                </p>
              </div>
              <button
                onClick={() => { setStep('role'); setError(''); }}
                className="w-full py-4.5 bg-[#00478d] text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-xs"
              >
                {t('login.pending.button')}
              </button>
            </motion.div>
          ) : step === 'reset-success' ? (
            <motion.div 
               key="success"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50 text-center"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('login.reset.success')}</h2>
              <p className="text-slate-500 text-sm mb-8">
                Your account is secure now.
              </p>
              <button
                onClick={() => setStep('login')}
                className="w-full py-4 bg-[#00478d] text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] transition-all"
              >
                {t('login.reset.back')}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50"
            >
              <button onClick={() => { setStep('role'); setError(''); }} className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors" disabled={isSubmitting}>
                <ArrowLeft size={16} className="mr-2" />
                {t('login.button.back_role')}
              </button>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full bg-[#00478d]/10 text-[#00478d] text-xs font-bold mb-3">
                  {getRoleLabel(selectedRole)} Access
                </span>
                <h2 className="text-2xl font-bold text-slate-800">
                  {step === 'login' ? t('login.title') : 'Recover Access'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {step === 'login' ? t('login.subtitle') : 'Provide your contact info to receive reset instructions.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <CircleAlert size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 ml-1">
                      {step === 'login' ? t('login.label.identity') : t('login.label.email')}
                    </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      {emailOrPhone.includes('@') || step !== 'login' ? <Mail className="h-5 w-5 text-slate-400" /> : <MessageSquare className="h-5 w-5 text-slate-400" />}
                    </div>
                    <input
                      type="text"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder={'you@link.com or 08...'}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {step !== 'forgot-password' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 ml-1">{t('login.label.password')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {step === 'login' && (
                  <div className="flex items-center justify-end">
                    <button type="button" onClick={() => setStep('forgot-password')} className="text-sm font-medium text-[#00478d] hover:underline" disabled={isSubmitting}>
                      {t('login.label.forgot')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#00478d] text-white rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (step === 'login' ? t('login.button.signin') : 'Send Instructions')}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                {step === 'login' ? null : (
                  <button onClick={() => setStep('login')} className="font-bold text-[#00478d]">{t('login.footer.back')}</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
