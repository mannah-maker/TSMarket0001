import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { ordersAPI } from '../lib/api';
import { 
  Package, Clock, CheckCircle, Truck, MapPin, XCircle, ArrowLeft, Copy, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  pending: { 
    icon: Clock, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/20',
    ru: 'Ожидает подтверждения',
    tj: 'Интизории тасдиқ'
  },
  confirmed: { 
    icon: CheckCircle, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/20',
    ru: 'Подтверждён',
    tj: 'Тасдиқ шуд'
  },
  processing: { 
    icon: Package, 
    color: 'text-purple-500', 
    bg: 'bg-purple-500/20',
    ru: 'Обрабатывается',
    tj: 'Коркард мешавад'
  },
  shipped: { 
    icon: Truck, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/20',
    ru: 'Отправлен',
    tj: 'Фиристода шуд'
  },
  delivered: { 
    icon: MapPin, 
    color: 'text-green-500', 
    bg: 'bg-green-500/20',
    ru: 'Доставлен',
    tj: 'Расонида шуд'
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-red-500', 
    bg: 'bg-red-500/20',
    ru: 'Отменён',
    tj: 'Бекор карда шуд'
  },
  returned: { 
    icon: ArrowLeft, 
    color: 'text-gray-500', 
    bg: 'bg-gray-500/20',
    ru: 'Возвращён',
    tj: 'Бозгашт шуд'
  },
  return_pending: { 
    icon: Clock, 
    color: 'text-purple-500', 
    bg: 'bg-purple-500/20',
    ru: 'Ожидает возврата',
    tj: 'Интизории бозгашт'
  }
};

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export const OrderTracking = () => {
  const { orderId } = useParams();
  const { lang } = useLanguage();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderTracking();
  }, [orderId]);

  const fetchOrderTracking = async () => {
    try {
      const res = await ordersAPI.track(orderId);
      setOrder(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Заказ не найден');
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingNumber = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      toast.success(lang === 'ru' ? 'Скопировано!' : 'Нусхабардорӣ шуд!');
    }
  };

  const handleReturn = async () => {
    if (!window.confirm(lang === 'ru' ? 'Вы уверены, что хотите вернуть товар? Вам будет возвращено 90% от стоимости.' : 'Шумо мутмаин ҳастед, ки мехоҳед молро баргардонед? Ба шумо 90% маблағ баргардонида мешавад.')) {
      return;
    }

    setReturning(true);
    try {
      const res = await ordersAPI.return(orderId);
      toast.success(res.data.message);
      fetchOrderTracking();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка при возврате');
    } finally {
      setReturning(false);
    }
  };

  const canReturn = () => {
    if (!order) return false;
    if (order.status === 'returned' || order.status === 'cancelled' || order.status === 'return_pending') return false;
    
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const diffHours = (now - createdAt) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const getCurrentStatusIndex = () => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    return statusOrder.indexOf(order.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="tsmarket-card p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{lang === 'ru' ? 'Заказ не найден' : 'Фармоиш ёфт нашуд'}</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/profile">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {lang === 'ru' ? 'К профилю' : 'Ба профил'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();
  const currentConfig = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = currentConfig.icon;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/profile" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {lang === 'ru' ? 'Назад к профилю' : 'Бозгашт ба профил'}
          </Link>
          <h1 className="text-3xl font-bold">
            {lang === 'ru' ? 'Отслеживание заказа' : 'Пайгирии фармоиш'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {lang === 'ru' ? 'Заказ' : 'Фармоиш'} #{order.order_id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Current Status Card */}
        <div className={`tsmarket-card p-6 mb-8 border-l-4 ${currentConfig.color.replace('text-', 'border-')}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${currentConfig.bg} flex items-center justify-center`}>
                <StatusIcon className={`w-8 h-8 ${currentConfig.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {lang === 'ru' ? 'Текущий статус' : 'Вазъияти ҳозира'}
                </p>
                <h2 className={`text-2xl font-bold ${currentConfig.color}`}>
                  {lang === 'ru' ? currentConfig.ru : currentConfig.tj}
                </h2>
                {order.updated_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === 'ru' ? 'Обновлено' : 'Навсозӣ'}: {new Date(order.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {canReturn() && (
              <Button 
                variant="destructive" 
                onClick={handleReturn}
                disabled={returning}
                className="w-full md:w-auto"
              >
                {returning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                )}
                {lang === 'ru' ? 'Вернуть товар (90%)' : 'Бозгашти мол (90%)'}
              </Button>
            )}
          </div>
        </div>

        {/* Tracking Number */}
        {order.tracking_number && (
          <div className="tsmarket-card p-4 mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              {lang === 'ru' ? 'Трек-номер' : 'Рақами пайгирӣ'}
            </p>
            <div className="flex items-center gap-3">
              <code className="text-lg font-mono bg-muted px-4 py-2 rounded-lg flex-1">
                {order.tracking_number}
              </code>
              <Button variant="outline" size="icon" onClick={copyTrackingNumber}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        {order.status !== 'cancelled' && (
          <div className="tsmarket-card p-6 mb-8">
            <h3 className="font-bold mb-6">{lang === 'ru' ? 'Прогресс заказа' : 'Пешрафти фармоиш'}</h3>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
              <div 
                className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                style={{ height: `${Math.max(0, currentStatusIndex) * 25}%` }}
              />
              
              {/* Steps */}
              <div className="space-y-8">
                {statusOrder.map((status, index) => {
                  const config = statusConfig[status];
                  const Icon = config.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  
                  return (
                    <div key={status} className="flex items-center gap-4 relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCompleted ? config.bg : 'bg-muted'
                      } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}>
                        <Icon className={`w-5 h-5 ${isCompleted ? config.color : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${isCompleted ? '' : 'text-muted-foreground'}`}>
                          {lang === 'ru' ? config.ru : config.tj}
                        </p>
                        {isCurrent && order.status_history?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.status_history[order.status_history.length - 1].timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Status History */}
        {order.status_history && order.status_history.length > 0 && (
          <div className="tsmarket-card p-6">
            <h3 className="font-bold mb-4">{lang === 'ru' ? 'История статусов' : 'Таърихи вазъиятҳо'}</h3>
            <div className="space-y-3">
              {[...order.status_history].reverse().map((entry, index) => {
                const config = statusConfig[entry.status] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
                    <div className="flex-1">
                      <p className="font-medium">{lang === 'ru' ? config.ru : config.tj}</p>
                      {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Order Created */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {lang === 'ru' ? 'Заказ создан' : 'Фармоиш сохта шуд'}: {new Date(order.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
