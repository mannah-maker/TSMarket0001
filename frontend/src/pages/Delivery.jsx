import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deliveryAPI, adminAPI } from '../lib/api';
import { 
  Truck, Package, MapPin, Phone, Clock, 
  CheckCircle, Loader2, RefreshCw, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export const Delivery = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [takingOrderId, setTakingOrderId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await deliveryAPI.getAvailableOrders();
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch delivery orders:', error);
      toast.error(language === 'ru' ? 'Ошибка загрузки заказов' : 'Хатои боркунии фармоишҳо');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    const isDelivery = user?.role === 'delivery' || user?.role === 'admin' || user?.is_admin;
    if (!isAuthenticated || !isDelivery) {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, user, navigate, authLoading]);

  const handleTakeOrder = async (orderId) => {
    setTakingOrderId(orderId);
    try {
      await deliveryAPI.takeOrder(orderId);
      toast.success(language === 'ru' ? 'Заказ принят!' : 'Фармоиш қабул шуд!');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ru' ? 'Ошибка' : 'Хатогӣ'));
    } finally {
      setTakingOrderId(null);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrderStatus(orderId, status, 'Обновлено доставщиком');
      toast.success(language === 'ru' ? 'Статус обновлен' : 'Статус нав карда шуд');
      fetchOrders();
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка обновления' : 'Хатои навсозӣ');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen tsmarket-gradient flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const myOrders = orders.filter(o => o.delivery_user_id === user?.user_id);
  const availableOrders = orders.filter(o => !o.delivery_user_id);

  return (
    <div className="min-h-screen tsmarket-gradient py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            {language === 'ru' ? 'Панель доставщика' : 'Панели расонанда'}
          </h1>
          <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* My Current Deliveries */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
            <Package className="w-5 h-5" />
            {language === 'ru' ? 'Мои активные доставки' : 'Расонидани фаъоли ман'}
          </h2>
          {myOrders.length === 0 ? (
            <div className="tsmarket-card p-6 text-center text-slate-400">
              {language === 'ru' ? 'У вас пока нет активных доставок' : 'Шумо то ҳол расонидани фаъол надоред'}
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map(order => (
                <div key={order.order_id} className="tsmarket-card p-6 border-l-4 border-l-green-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-slate-400">ID: {order.order_id}</p>
                      <p className="font-bold text-lg">{order.total.toFixed(0)} coins</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase">
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{language === 'ru' ? 'Адрес доставки:' : 'Суроғаи расонидан:'}</p>
                        <p className="text-slate-300">{order.delivery_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{language === 'ru' ? 'Телефон:' : 'Телефон:'}</p>
                        <p className="text-slate-300">{order.phone_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === 'processing' && (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700" 
                        onClick={() => handleUpdateStatus(order.order_id, 'shipped')}
                      >
                        {language === 'ru' ? 'В пути' : 'Дар роҳ'}
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button 
                        className="bg-green-600 hover:bg-green-700" 
                        onClick={() => handleUpdateStatus(order.order_id, 'delivered')}
                      >
                        {language === 'ru' ? 'Доставлено' : 'Расонида шуд'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Orders */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            {language === 'ru' ? 'Доступные заказы' : 'Фармоишҳои дастрас'}
          </h2>
          {availableOrders.length === 0 ? (
            <div className="tsmarket-card p-6 text-center text-slate-400">
              {language === 'ru' ? 'Нет доступных заказов для доставки' : 'Фармоишҳои дастрас барои расонидан нест'}
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map(order => (
                <div key={order.order_id} className="tsmarket-card p-6 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
                      <p className="font-bold">{order.total.toFixed(0)} coins</p>
                    </div>
                    <Button 
                      onClick={() => handleTakeOrder(order.order_id)}
                      disabled={takingOrderId === order.order_id}
                      className="tsmarket-btn-primary"
                    >
                      {takingOrderId === order.order_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        language === 'ru' ? 'Взять заказ' : 'Гирифтани фармоиш'
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{order.delivery_address}</span>
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
