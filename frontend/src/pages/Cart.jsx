import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ordersAPI, promoAPI } from '../lib/api';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Wallet, Sparkles, ShoppingBag, MapPin, Phone, Clock, Tag, CheckCircle, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export const Cart = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, total, totalXP } = useCart();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValid, setPromoValid] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);

  // Check if user is in TOP 10 (this would ideally come from the user object or a separate API call)
  // For the frontend display, we'll assume the user knows if they are in TOP 10 or we can check their rank if available
  // Check if user is in TOP 10 (admins never count as TOP 10)
  const isTop10 = !user?.is_admin && user?.role !== 'admin' && (user?.is_top_10 || false);

  // Level discount (1% per level up to level 10, then 0.5% per level, no max cap)
  const userLevel = user?.level || 1;
  let levelDiscount = userLevel <= 10 ? userLevel : 10 + (userLevel - 10) * 0.5;
  let currentPromoDiscount = promoDiscount;

  if (isTop10) {
    levelDiscount *= 2;
    currentPromoDiscount *= 2;
  }
  
  // Calculate totals with discounts
  const subtotal = total;
  const levelDiscountAmount = subtotal * (levelDiscount / 100);
  const afterLevelDiscount = subtotal - levelDiscountAmount;
  const promoDiscountAmount = afterLevelDiscount * (currentPromoDiscount / 100);
  const finalTotal = Math.round((afterLevelDiscount - promoDiscountAmount) * 100) / 100;
  const totalSaved = Math.round((levelDiscountAmount + promoDiscountAmount) * 100) / 100;

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    
    setPromoLoading(true);
    try {
      const res = await promoAPI.validate(promoCode.trim());
      setPromoDiscount(res.data.discount_percent);
      setPromoValid(true);
      toast.success(`${t('cart.promoApplied')} -${res.data.discount_percent}%`);
    } catch (error) {
      setPromoDiscount(0);
      setPromoValid(false);
      toast.error(error.response?.data?.detail || t('cart.promoInvalid'));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error(t('cart.pleaseLogin'));
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      toast.error(t('cart.empty'));
      return;
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      toast.error(t('cart.enterAddress'));
      return;
    }

    if (!phoneNumber || phoneNumber.trim().length < 7) {
      toast.error(t('cart.enterPhone'));
      return;
    }

    if ((user?.balance || 0) < finalTotal) {
      toast.error(t('cart.insufficientBalance'));
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        custom_request: item.customRequest,
      }));

      const res = await ordersAPI.create(orderItems, deliveryAddress.trim(), phoneNumber.trim(), promoValid ? promoCode.trim() : null);
      const { xp_gained, level_up, new_level, discount_applied } = res.data;

      clearCart();
      setDeliveryAddress('');
      setPhoneNumber('');
      setPromoCode('');
      setPromoDiscount(0);
      setPromoValid(false);
      await refreshUser();

      if (level_up) {
        toast.success(`${t('cart.levelUp')} ${new_level}! 🎉`);
      }
      if (discount_applied > 0) {
        toast.success(`${t('cart.discountSaved')} ${discount_applied}!`);
      }
      toast.success(`${t('cart.orderComplete')} +${xp_gained} XP!`);
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('cart.checkoutFailed'));
    } finally {
      setLoading(false);
    }
  };

  const insufficientBalance = isAuthenticated && (user?.balance || 0) < finalTotal;

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="cart-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">{t('cart.title')}</h1>

        {items.length === 0 ? (
          <div className="empty-state tsmarket-card p-12">
            <ShoppingBag className="empty-state-icon" />
            <h3 className="text-xl font-bold mb-2">{t('cart.empty')}</h3>
            <p className="text-muted-foreground mb-6">{t('cart.startShopping')}</p>
            <Link to="/catalog">
              <Button className="tsmarket-btn-primary rounded-full px-8" data-testid="start-shopping-btn">
                {t('cart.browseCatalog')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.product_id}-${item.size}-${item.color}-${item.customRequest}`}
                  className="tsmarket-card p-4 flex gap-4"
                  data-testid={`cart-item-${item.product_id}`}
                >
                  <Link to={`/product/${item.product_id}`}>
                    <img
                      src={item.product?.image_url}
                      alt={item.product?.name}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                  </Link>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/product/${item.product_id}`}>
                          <h3 className="font-bold hover:text-primary transition-colors">
                            {item.product?.name}
                          </h3>
                        </Link>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {item.size && (
                            <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                          )}
                          {item.color && (
                            <p className="text-sm text-muted-foreground">Color: {item.color}</p>
                          )}
                          {item.customRequest && (
                            <p className="text-sm text-primary font-medium mt-1 italic">
                              {t('cart.request') || 'Request'}: {item.customRequest}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-sm text-primary font-bold">
                            +{(item.product?.xp_reward || 0) * item.quantity} XP
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80"
                        onClick={() => removeItem(item.product_id, item.size, item.color, item.customRequest)}
                        data-testid={`remove-${item.product_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size, item.color, item.customRequest)}
                          data-testid={`qty-minus-${item.product_id}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-bold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size, item.color, item.customRequest)}
                          data-testid={`qty-plus-${item.product_id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <span className="text-xl font-black text-primary">
                        {(item.product?.price || 0) * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                className="text-destructive"
                onClick={clearCart}
                data-testid="clear-cart-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('cart.clearCart')}
              </Button>
            </div>

            {/* Order Summary */}
            <div>
              <div className="tsmarket-card p-6 sticky top-24" data-testid="order-summary">
                <h3 className="font-bold text-lg mb-4">{t('cart.orderSummary')}</h3>
                
                {/* Delivery Info */}
                <div className="p-3 bg-blue-50 rounded-xl mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-bold text-blue-800">{t('cart.deliveryTime')}</p>
                    <p className="text-sm text-blue-600">24 {t('cart.hours')}</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  {isTop10 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-bold text-yellow-800">TOP 10 BONUS!</p>
                        <p className="text-xs text-yellow-700">Ваши скидки удвоены!</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.items')} ({items.length})</span>
                    <span className="font-bold">{subtotal}</span>
                  </div>
                  
                  {/* Level Discount */}
                  {levelDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {t('cart.levelDiscount')} ({levelDiscount}%)
                      </span>
                      <span className="font-bold">-{levelDiscountAmount}</span>
                    </div>
                  )}

                  {/* Promo Code */}
                  <div className="pt-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('cart.promoCode')}
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="h-9"
                        disabled={promoValid || promoLoading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={validatePromo}
                        disabled={!promoCode || promoValid || promoLoading}
                      >
                        {promoLoading ? <Clock className="w-4 h-4 animate-spin" /> : t('cart.apply')}
                      </Button>
                    </div>
                    {promoValid && (
                      <div className="flex justify-between text-green-600 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {t('cart.promoDiscount')} ({promoDiscount}%)
                        </span>
                        <span className="font-bold">-{promoDiscountAmount}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 flex justify-between items-end">
                    <span className="font-bold">{t('cart.total')}</span>
                    <div className="text-right">
                      {totalSaved > 0 && (
                        <p className="text-xs text-green-600 font-medium mb-1">
                          {t('cart.saved')} {totalSaved}
                        </p>
                      )}
                      <span className="text-3xl font-black text-primary leading-none">
                        {finalTotal}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 text-primary font-bold bg-primary/5 py-2 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    <span>+ {totalXP} XP</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      {t('cart.deliveryAddress')}
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Textarea
                        placeholder={t('cart.addressPlaceholder')}
                        className="pl-9 min-h-[80px] resize-none"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      {t('cart.phoneNumber')}
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="+992 XXX XX XX XX"
                        className="pl-9"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">{t('cart.yourBalance')}</span>
                      <span className={`font-bold ${insufficientBalance ? 'text-destructive' : ''}`}>
                        {user?.balance || 0}
                      </span>
                    </div>
                    
                    <Button
                      className="w-full tsmarket-btn-primary h-12 rounded-xl text-lg font-bold"
                      onClick={handleCheckout}
                      disabled={loading || items.length === 0}
                      data-testid="checkout-btn"
                    >
                      {loading ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Wallet className="w-5 h-5 mr-2" />
                          {t('cart.checkout')}
                        </>
                      )}
                    </Button>
                    
                    {insufficientBalance && (
                      <Link to="/topup">
                        <Button variant="link" className="w-full text-primary font-bold mt-2">
                          {t('cart.topUpNow')}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t('cart.securePayment')}</p>
                    <p className="text-xs text-muted-foreground">{t('cart.securePaymentDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
