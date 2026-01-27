import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ordersAPI } from '../lib/api';
import { Wallet, Sparkles, Gift, ShoppingBag, Calendar, Trophy, Settings, Truck, Eye, Clock, CheckCircle, Package, MapPin, XCircle } from 'lucide-react';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await ordersAPI.getAll();
        // Ensure orders is always an array
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  // Calculate XP progress
  const xpForCurrentLevel = calculateTotalXPForLevel(user.level);
  const xpForNextLevel = calculateTotalXPForLevel(user.level + 1);
  const xpInCurrentLevel = user.xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForLevel) * 100, 100);

  function calculateTotalXPForLevel(level) {
    let total = 0;
    for (let l = 1; l < level; l++) {
      total += 100 + l * 50;
    }
    return total;
  }

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="profile-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="tsmarket-card p-8 mb-8" data-testid="profile-header">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30"
                  data-testid="profile-avatar"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center ring-4 ring-primary/30">
                  <span className="text-primary-foreground font-black text-3xl">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 level-badge" data-testid="profile-level">
                {user.level}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold" data-testid="profile-name">{user.name}</h1>
              <p className="text-muted-foreground" data-testid="profile-email">{user.email}</p>
              
              {/* Level Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-bold">{t('common.level')} {user.level}</span>
                  <span className="text-muted-foreground">
                    {xpInCurrentLevel} / {xpNeededForLevel} XP
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" data-testid="xp-progress" />
                <p className="text-xs text-muted-foreground mt-1">
                  {xpNeededForLevel - xpInCurrentLevel} {t('profile.xpToNext')} {user.level + 1}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-2xl">
                <Wallet className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-black text-primary" data-testid="profile-balance">
                  {user.balance?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">{t('profile.balance')}</p>
              </div>
              <div className="text-center p-4 bg-secondary/20 rounded-2xl">
                <Sparkles className="w-6 h-6 text-secondary-foreground mx-auto mb-1" />
                <p className="text-2xl font-black text-secondary-foreground" data-testid="profile-xp">
                  {user.xp || 0}
                </p>
                <p className="text-xs text-muted-foreground">{t('profile.totalXP')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/topup" className="tsmarket-card p-4 text-center hover:border-primary/50 transition-colors" data-testid="quick-topup">
            <Wallet className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold">{t('profile.topUp')}</p>
          </Link>
          <Link to="/rewards" className="tsmarket-card p-4 text-center hover:border-primary/50 transition-colors" data-testid="quick-rewards">
            <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold">{t('profile.rewards')}</p>
            {user.wheel_spins_available > 0 && (
              <span className="text-xs text-secondary-foreground bg-secondary/30 px-2 py-1 rounded-full">
                {user.wheel_spins_available} {t('rewards.spinsAvailable')}!
              </span>
            )}
          </Link>
          <Link to="/catalog" className="tsmarket-card p-4 text-center hover:border-primary/50 transition-colors" data-testid="quick-shop">
            <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold">{t('profile.shop')}</p>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="tsmarket-card p-4 text-center hover:border-destructive/50 transition-colors border-destructive/30" data-testid="quick-admin">
              <Settings className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="font-bold text-destructive">{t('nav.admin')}</p>
            </Link>
          )}
        </div>

        {/* Order History */}
        <div className="tsmarket-card p-6" data-testid="order-history">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {t('profile.orderHistory')}
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : !Array.isArray(orders) || orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">{t('profile.noOrders')}</p>
              <Link to="/catalog">
                <Button className="mt-4 rounded-full" variant="outline">
                  {t('home.shopNow')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusConfig = {
                  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: lang === 'ru' ? 'Ожидает' : 'Интизорӣ' },
                  confirmed: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/20', label: lang === 'ru' ? 'Подтверждён' : 'Тасдиқ шуд' },
                  processing: { icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/20', label: lang === 'ru' ? 'Обрабатывается' : 'Коркард' },
                  shipped: { icon: Truck, color: 'text-orange-500', bg: 'bg-orange-500/20', label: lang === 'ru' ? 'Отправлен' : 'Фиристода шуд' },
                  delivered: { icon: MapPin, color: 'text-green-500', bg: 'bg-green-500/20', label: lang === 'ru' ? 'Доставлен' : 'Расонида шуд' },
                  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: lang === 'ru' ? 'Отменён' : 'Бекор шуд' },
                  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: lang === 'ru' ? 'Завершён' : 'Анҷом ёфт' }
                };
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                
                return (
                  <div
                    key={order.order_id}
                    className="p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors"
                    data-testid={`order-${order.order_id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{order.order_id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 ${config.bg} ${config.color} rounded-full flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{order.items?.length || 0} {t('cart.items')}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {Array.isArray(order.items) ? order.items.map((i) => i.product_name).join(', ') : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-primary">{order.total}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          +{order.total_xp} XP
                        </p>
                      </div>
                    </div>
                    
                    {/* Tracking button */}
                    <div className="mt-3 flex items-center justify-between">
                      {order.tracking_number && (
                        <p className="text-xs text-muted-foreground">
                          📦 Трек: <span className="font-mono">{order.tracking_number}</span>
                        </p>
                      )}
                      <Link to={`/order/${order.order_id}`} className="ml-auto">
                        <Button size="sm" variant="outline" className="rounded-full">
                          <Eye className="w-4 h-4 mr-1" />
                          {lang === 'ru' ? 'Отследить' : 'Пайгирӣ'}
                        </Button>
                      </Link>
                    </div>
                    
                    {order.delivery_address && (
                      <div className="mt-2 p-2 bg-muted/30 rounded-lg text-sm">
                        <span className="text-muted-foreground">📍 {t('cart.deliveryAddress')}:</span>
                        <p className="font-medium">{order.delivery_address}</p>
                      </div>
                    )}
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
