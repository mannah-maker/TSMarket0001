import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { topupAPI, bankCardsAPI } from '../lib/api';
import { optimizeImage } from '../utils/imageOptimizer';
import { Wallet, Copy, Check, Upload, Clock, CheckCircle, XCircle, Image, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export const TopUp = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef(null);
  
  const [settings, setSettings] = useState({ card_number: '', card_holder: '', additional_info: '' });
  const [bankCards, setBankCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, requestsRes, cardsRes] = await Promise.all([
        topupAPI.getSettings(),
        topupAPI.getRequests(),
        bankCardsAPI.getAll(),
      ]);
      setSettings(settingsRes.data || { card_number: '', card_holder: '', additional_info: '' });
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
      const cards = Array.isArray(cardsRes.data) ? cardsRes.data : [];
      setBankCards(cards);
      if (cards.length > 0 && !selectedCard) {
        setSelectedCard(cards[0]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, [selectedCard]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, fetchData]);

  const handleCopyCard = (cardNumber) => {
    navigator.clipboard.writeText(cardNumber || settings.card_number);
    setCopied(true);
    toast.success(t('topup.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Optimize receipt image (smaller size is enough for AI/Admin verification)
        const optimized = await optimizeImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.6 });
        setReceiptPreview(optimized);
        setReceiptUrl(optimized);
      } catch (error) {
        console.error('Receipt optimization failed:', error);
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceiptPreview(e.target.result);
          setReceiptUrl(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t('topup.enterAmount'));
      return;
    }
    
    if (!receiptUrl) {
      toast.error(t('topup.uploadRequired'));
      return;
    }

    setLoading(true);
    try {
      await topupAPI.createRequest({
        amount: parseFloat(amount),
        receipt_url: receiptUrl,
      });
      toast.success(t('topup.requestSent'));
      setAmount('');
      setReceiptUrl('');
      setReceiptPreview(null);
      await fetchData();
      
      // Start auto-checking for approval every 30 seconds
      startStatusChecking();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Auto-check status every 30 seconds
  const startStatusChecking = () => {
    const checkInterval = setInterval(async () => {
      try {
        const res = await topupAPI.getRequests();
        const data = Array.isArray(res.data) ? res.data : [];
        const pendingRequests = data.filter(r => r.status === 'pending');
        const approvedRecently = data.find(r => 
          r.status === 'approved' && 
          new Date(r.created_at) > new Date(Date.now() - 10 * 60 * 1000) // last 10 minutes
        );
        
        if (approvedRecently) {
          clearInterval(checkInterval);
          toast.success(t('topup.approved'));
          await refreshUser();
          navigate('/profile');
        }
        
        // Stop checking if no pending requests
        if (pendingRequests.length === 0) {
          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 30000); // 30 seconds
    
    // Clean up after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10 * 60 * 1000);
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
      pending: t('topup.status.pending'),
      approved: t('topup.status.approved'),
      rejected: t('topup.status.rejected'),
    };
    return statusMap[status] || status;
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="topup-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{t('topup.title')}</h1>
        <p className="text-lg text-muted-foreground mb-8">{t('topup.subtitle')}</p>

        {/* Current Balance */}
        <div className="tsmarket-card p-6 mb-8" data-testid="current-balance">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('topup.currentBalance')}</p>
              <p className="text-3xl font-black text-primary" data-testid="balance-amount">
                {user?.balance?.toFixed(0) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Bank Cards Selection */}
        {(Array.isArray(bankCards) && bankCards.length > 0) ? (
          <div className="tsmarket-card p-6 mb-8 border-2 border-primary/30" data-testid="card-info">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {language === 'ru' ? 'Выберите карту для перевода' : 'Кортро интихоб кунед'}
            </h3>
            <div className="space-y-3">
              {bankCards.map((card) => (
                <div 
                  key={card.card_id}
                  onClick={() => setSelectedCard(card)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    selectedCard?.card_id === card.card_id 
                      ? 'bg-primary/20 border-2 border-primary' 
                      : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-primary" />
                      <span className="font-bold">{card.bank_name}</span>
                    </div>
                    {selectedCard?.card_id === card.card_id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <p className="text-xl font-mono font-bold tracking-wider">{card.card_number}</p>
                  <p className="text-sm text-muted-foreground">{card.card_holder}</p>
                </div>
              ))}
            </div>
            {selectedCard && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCard(selectedCard.card_number)}
                className="mt-4 rounded-full"
                data-testid="copy-card-btn"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('topup.copied') : t('topup.copyCard')}
              </Button>
            )}
          </div>
        ) : settings.card_number && (
          <div className="tsmarket-card p-6 mb-8 border-2 border-primary/30" data-testid="card-info">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              {t('topup.cardNumber')}
            </h3>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
              <p className="flex-1 text-2xl font-mono font-bold tracking-wider" data-testid="card-number">
                {settings.card_number}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCard()}
                className="rounded-full"
                data-testid="copy-card-btn"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('topup.copied') : t('topup.copyCard')}
              </Button>
            </div>
            {settings.card_holder && (
              <p className="text-sm text-muted-foreground mt-2">{settings.card_holder}</p>
            )}
            {settings.additional_info && (
              <p className="text-sm text-muted-foreground mt-1">{settings.additional_info}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="tsmarket-card p-6 mb-8 bg-primary/5" data-testid="instructions">
          <h3 className="font-bold mb-4">{t('topup.instructions')}</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              {t('topup.step1')}
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              {t('topup.step2')}
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              {t('topup.step3')}
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
              {t('topup.step4')}
            </li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="tsmarket-card p-6 mb-8" data-testid="topup-form">
          <h3 className="font-bold mb-4">{t('topup.submitRequest')}</h3>
          
          {/* Amount */}
          <div className="mb-4">
            <label className="text-sm font-bold mb-2 block">{t('topup.amount')}</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="tsmarket-input text-lg"
              data-testid="amount-input"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(amt.toString())}
                  className="rounded-full"
                >
                  {amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="mb-6">
            <p className="text-sm font-bold mb-2">{t('topup.uploadReceipt')}</p>
            
            {/* Upload area */}
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                receiptPreview ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              {receiptPreview ? (
                <div className="space-y-3">
                  <img 
                    src={receiptPreview} 
                    alt="Receipt preview" 
                    className="max-h-48 mx-auto rounded-lg"
                    data-testid="receipt-preview"
                  />
                  <p className="text-sm text-primary font-bold">✓ {t('topup.uploaded')}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptPreview(null);
                      setReceiptUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-sm text-destructive underline"
                  >
                    {t('topup.removeFile')}
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">{t('topup.dragDrop')}</p>
                  
                  {/* Mobile-friendly file input using label */}
                  <label 
                    htmlFor="receipt-file-input"
                    className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-primary text-primary-foreground text-base font-bold cursor-pointer active:scale-95 transition-transform touch-manipulation"
                  >
                    <Image className="w-5 h-5" />
                    {t('topup.selectFile')}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="receipt-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                    data-testid="receipt-input"
                  />
                </div>
              )}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full tsmarket-btn-primary rounded-full py-6"
            disabled={loading || !amount || !receiptUrl}
            data-testid="submit-request-btn"
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              t('topup.submitRequest')
            )}
          </Button>
        </form>

        {/* Request History */}
        <div className="tsmarket-card p-6" data-testid="request-history">
          <h3 className="font-bold mb-4">{t('topup.requestHistory')}</h3>
          
          {(!Array.isArray(requests) || requests.length === 0) ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">{t('topup.noRequests')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.request_id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  data-testid={`request-${req.request_id}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(req.status)}
                    <div>
                      <p className="font-bold text-xl text-primary">+{req.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {getStatusText(req.status)}
                    </span>
                    {req.admin_note && (
                      <p className="text-xs text-muted-foreground mt-1">{req.admin_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
