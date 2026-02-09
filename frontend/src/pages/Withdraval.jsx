import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { withdrawalAPI } from '../lib/api';
import { Wallet, Clock, CheckCircle, XCircle, CreditCard, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const Withdrawal = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await withdrawalAPI.getRequests();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch withdrawal requests:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const withdrawalAmount = parseFloat(amount);
    if (!amount || withdrawalAmount <= 0) {
      toast.error(language === 'ru' ? 'Введите корректную сумму' : 'Маблағро дуруст ворид кунед');
      return;
    }
    
    if (withdrawalAmount > user.balance) {
      toast.error(language === 'ru' ? 'Недостаточно средств' : 'Маблағ нокифоя аст');
      return;
    }
    
    if (!cardNumber || cardNumber.length < 16) {
      toast.error(language === 'ru' ? 'Введите корректный номер карты' : 'Рақами кортро дуруст ворид кунед');
      return;
    }

    if (!cardType) {
      toast.error(language === 'ru' ? 'Укажите банк или тип карты' : 'Бонк ё навъи кортро нишон диҳед');
      return;
    }

    setLoading(true);
    try {
      await withdrawalAPI.createRequest({
        amount: withdrawalAmount,
        card_number: cardNumber,
        card_type: cardType,
      });
      toast.success(language === 'ru' ? 'Заявка отправлена! Обработка в течение часа.' : 'Дархост фиристода шуд! Коркард дар давоми як соат.');
      setAmount('');
      setCardNumber('');
      setCardType('');
      await fetchData();
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: language === 'ru' ? 'В обработке' : 'Дар коркард',
      approved: language === 'ru' ? 'Выполнено' : 'Иҷро шуд',
      rejected: language === 'ru' ? 'Отклонено' : 'Рад шуд',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen tsmarket-gradient py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ru' ? 'Назад в профиль' : 'Бозгашт ба профил'}
        </button>

        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {language === 'ru' ? 'Вывод средств' : 'Баровардани маблағ'}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          {language === 'ru' ? 'Оставьте заявку на вывод средств на вашу карту' : 'Барои баровардани маблағ ба корти худ дархост гузоред'}
        </p>

        {/* Current Balance */}
        <div className="tsmarket-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('topup.currentBalance')}</p>
              <p className="text-3xl font-black text-primary">
                {user?.balance?.toFixed(0) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="tsmarket-card p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">{t('topup.amount')}</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 h-14 text-xl font-bold rounded-2xl"
                />
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">
                {language === 'ru' ? 'Номер карты' : 'Рақами корт'}
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  className="pl-10 h-14 text-xl font-bold rounded-2xl"
                />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">
                {language === 'ru' ? 'Название банка / Тип карты' : 'Номи бонк / Навъи корт'}
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={language === 'ru' ? 'Например: Душанбе Сити, Алиф' : 'Мисол: Душанбе Сити, Алиф'}
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="pl-10 h-14 text-lg font-bold rounded-2xl"
                />
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {language === 'ru' 
                  ? 'Заявки обрабатываются в течение часа. Пожалуйста, убедитесь, что номер карты указан верно.' 
                  : 'Дархостҳо дар давоми як соат коркард мешаванд. Лутфан боварӣ ҳосил кунед, ки рақами корт дуруст нишон дода шудааст.'}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
              disabled={loading}
            >
              {loading ? t('common.loading') : (language === 'ru' ? 'Вывести средства' : 'Баровардани маблағ')}
            </Button>
          </form>
        </div>

        {/* History */}
        {requests.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold px-1">
              {language === 'ru' ? 'История выводов' : 'Таърихи баровардан'}
            </h3>
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.request_id} className="tsmarket-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      req.status === 'approved' ? 'bg-green-500/10' : 
                      req.status === 'rejected' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                    }`}>
                      {getStatusIcon(req.status)}
                    </div>
                    <div>
                      <p className="font-bold">{req.amount} {t('common.coins')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleString()} • {req.card_type || 'Card'} ({req.card_number.slice(-4).padStart(16, '*')})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      req.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                      req.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {getStatusText(req.status)}
                    </span>
                    {req.admin_note && (
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] truncate">
                        {req.admin_note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
