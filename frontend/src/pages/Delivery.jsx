import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI } from '../lib/api';
import { 
  Truck, Package, Clock, CheckCircle, XCircle, Eye, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export const Delivery = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const isDelivery = user?.role === 'delivery' || user?.role === 'admin' || user?.is_admin;

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !isDelivery) {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, isDelivery, navigate, authLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersRes = await adminAPI.getOrders();
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error(lang === 'ru' ? 'Ошибка загрузки заказов' : 'Хатои боркунии фармоишҳо');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      let trackingNumber = null;
      if (status === 'shipped') {
        trackingNumber = prompt(lang === 'ru' ? 'Введите трек-номер (опционально):' : 'Рақами пайгириро ворид кунед:');
      }
      await adminAPI.updateOrderStatus(orderId, status, null, trackingNumber);
      toast.success(lang === 'ru' ? 'Статус обновлён!' : 'Вазъият навсозӣ шуд!');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Truck className="w-8 h-8 text-primary" />
              {lang === 'ru' ? 'Панель доставщика' : 'Панели расонанда'}
            </h1>
            <p className="text-slate-400 mt-1">
              {lang === 'ru' ? 'Управление заказами и доставкой' : 'Идоракунии фармоишҳо ва расонидан'}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="border-slate-700 hover:bg-slate-800"
            onClick={fetchOrders} 
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'ru' ? 'Обновить' : 'Навсозӣ'}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {lang === 'ru' ? `Все заказы (${orders.length})` : `Ҳамаи фармоишҳо (${orders.length})`}
            </h3>
          </div>

          {orders.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">{lang === 'ru' ? 'Заказов пока нет' : 'Фармоишҳо ҳанӯз нест'}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => {
                const statusConfig = {
                  pending: { color: 'bg-yellow-500/20 text-yellow-400', label: lang === 'ru' ? 'Ожидает' : 'Интизорӣ' },
                  confirmed: { color: 'bg-blue-500/20 text-blue-400', label: lang === 'ru' ? 'Подтверждён' : 'Тасдиқ шуд' },
                  processing: { color: 'bg-purple-500/20 text-purple-400', label: lang === 'ru' ? 'Обрабатывается' : 'Коркард' },
                  shipped: { color: 'bg-orange-500/20 text-orange-400', label: lang === 'ru' ? 'Отправлен' : 'Фиристода шуд' },
                  delivered: { color: 'bg-green-500/20 text-green-400', label: lang === 'ru' ? 'Доставлен' : 'Расонида шуд' },
                  cancelled: { color: 'bg-red-500/20 text-red-400', label: lang === 'ru' ? 'Отменён' : 'Бекор шуд' }
                };
                const config = statusConfig[order.status] || statusConfig.pending;

                return (
                  <div key={order.order_id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-slate-500">#{order.order_id.slice(-6).toUpperCase()}</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div>
                          <p className="font-bold text-lg">{order.total} coins</p>
                          <p className="text-sm text-slate-400">
                            {lang === 'ru' ? 'Покупатель: ' : 'Харидор: '}
                            <span className="text-slate-200">{order.user_email || order.user_id}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="bg-slate-800 rounded-md px-2 py-1 text-xs flex items-center gap-2">
                              <span className="text-slate-300">{item.name}</span>
                              <span className="text-primary font-bold">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {order.delivery_address && (
                          <div className="text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <p className="text-slate-400 mb-1">{lang === 'ru' ? 'Адрес доставки:' : 'Суроғаи расонидан:'}</p>
                            <p className="text-slate-200">{order.delivery_address}</p>
                            {order.phone_number && (
                              <p className="text-slate-200 mt-1">📞 {order.phone_number}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 justify-end">
                        {order.status === 'pending' && (
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleUpdateOrderStatus(order.order_id, 'confirmed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {lang === 'ru' ? 'Подтвердить' : 'Тасдиқ'}
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleUpdateOrderStatus(order.order_id, 'processing')}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {lang === 'ru' ? 'В обработку' : 'Ба коркард'}
                          </Button>
                        )}
                        {order.status === 'processing' && (
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleUpdateOrderStatus(order.order_id, 'shipped')}
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            {lang === 'ru' ? 'Отправить' : 'Фиристодан'}
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateOrderStatus(order.order_id, 'delivered')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {lang === 'ru' ? 'Доставлен' : 'Расонида шуд'}
                          </Button>
                        )}
                        {['pending', 'confirmed', 'processing'].includes(order.status) && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleUpdateOrderStatus(order.order_id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {lang === 'ru' ? 'Отменить' : 'Бекор кардан'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
