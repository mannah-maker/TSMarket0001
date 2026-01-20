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
  const { login, register, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error(t('auth.fillAllFields'));
      return;
    }
    
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success(t('auth.welcomeBack'));
      navigate('/profile');
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
      toast.success(t('auth.accountCreated'));
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.registerFailed'));
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
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
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
              </form>
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
          await processGoogleAuth(sessionId);
          toast.success(t('auth.welcomeBack'));
          navigate('/profile', { replace: true });
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
