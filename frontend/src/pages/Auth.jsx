import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_tsmarket-shop/artifacts/ku1akclq_%D0%BB%D0%BE%D0%B3%D0%BE.jpg";

export const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, verify, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'delivery' && !user.is_admin) {
        navigate('/delivery');
      } else {
        navigate('/profile');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error(t('auth.fillAllFields'));
      return;
    }
    
    setLoading(true);
    try {
      const userData = await login(loginEmail, loginPassword);
      toast.success(t('auth.welcomeBack'));
      if (userData.role === 'delivery' && !userData.is_admin) {
        navigate('/delivery');
      } else {
        navigate('/profile');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword || !registerConfirm) {
      toast.error(t('auth.fillAllFields'));
      return;
    }
    
    if (registerPassword !== registerConfirm) {
      toast.error(t('auth.passwordsNoMatch'));
      return;
    }
    
    if (registerPassword.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }
    
    setLoading(true);
    try {
      await register(registerEmail, registerPassword, registerName);
      toast.success(t('auth.codeSent'));
      setShowVerification(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error(t('auth.enterCode'));
      return;
    }

    setLoading(true);
    try {
      const userData = await verify(registerEmail, verificationCode);
      toast.success(t('auth.accountCreated'));
      if (userData.role === 'delivery' && !userData.is_admin) {
        navigate('/delivery');
      } else {
        navigate('/profile');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen tsmarket-gradient flex items-center justify-center py-12 px-4" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="TSMarket" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-xl" />
          <h1 className="text-3xl font-bold">
            <span className="text-green-500">TS</span>
            <span className="text-teal-500">Market</span>
          </h1>
          <p className="text-muted-foreground mt-2">{t('common.storeTagline')}</p>
        </div>

        {/* Auth Card */}
        <div className="tsmarket-card p-8">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">{t('auth.register')}</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 tsmarket-input"
                      data-testid="login-email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 tsmarket-input"
                      data-testid="login-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full tsmarket-btn-primary rounded-full py-6"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.login')}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full py-6 flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    />
                  </svg>
                  {t('auth.continueGoogle')}
                </Button>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              {showVerification ? (
                <>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">{t('auth.codeSent')}:</p>
                    <p className="font-bold">{registerEmail}</p>
                  </div>
                  <div>
                    <Label htmlFor="verification-code">{t('auth.verificationCode')}</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="verification-code"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 tsmarket-input text-center text-2xl tracking-[10px]"
                        data-testid="verification-code"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full tsmarket-btn-primary rounded-full py-6"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.verify')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowVerification(false)}
                  >
                    {t('product.back')}
                  </Button>
                </form>
                </>
              ) : (
                <>
                <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name">{t('auth.name')}</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder={t('auth.namePlaceholder')}
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="pl-10 tsmarket-input"
                      data-testid="register-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-email">{t('auth.email')}</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-10 tsmarket-input"
                      data-testid="register-email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="register-password">{t('auth.password')}</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-10 tsmarket-input"
                      data-testid="register-password"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-confirm">{t('auth.confirmPassword')}</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerConfirm}
                      onChange={(e) => setRegisterConfirm(e.target.value)}
                      className="pl-10 tsmarket-input"
                      data-testid="register-confirm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full tsmarket-btn-primary rounded-full py-6"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.createAccount')}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full py-6 flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    />
                  </svg>
                  {t('auth.continueGoogle')}
                </Button>
              </form>
              </>
              )}
            </TabsContent>
          </Tabs>

        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-white/50 backdrop-blur rounded-xl text-center">
          <p className="text-sm text-muted-foreground mb-2">{t('auth.demoAccount')}:</p>
          <p className="text-sm font-mono">your email/your password</p>
        </div>
      </div>
    </div>
  );
};

// Auth Callback Component for Google OAuth
export const AuthCallback = () => {
  const navigate = useNavigate();
  const { processGoogleAuth } = useAuth();
  const { t } = useLanguage();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const userData = await processGoogleAuth(sessionId);
          toast.success(t('auth.welcomeBack'));
          if (userData.role === 'delivery' && !userData.is_admin) {
            navigate('/delivery', { replace: true });
          } else {
            navigate('/profile', { replace: true });
          }
        } catch (error) {
          toast.error(t('auth.loginFailed'));
          navigate('/auth', { replace: true });
        }
      } else {
        navigate('/auth', { replace: true });
      }
    };

    processSession();
  }, [navigate, processGoogleAuth, t]);
  return (
    <div className="min-h-screen tsmarket-gradient flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-bold">{t('common.loading')}</p>
      </div>
    </div>
  );
};
