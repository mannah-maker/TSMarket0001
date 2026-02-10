import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ordersAPI, promoAPI } from '../lib/api';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Wallet, Sparkles, ShoppingBag, MapPin, Phone, Clock, Tag, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Cart = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, total, totalXP } = useCart();
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const [deliveryAddress, setDeliveryAddress] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [promoCode, setPromoCode] = React.useState('');
  const [promoDiscount, setPromoDiscount] = React.useState(0);
  const [promoValid, setPromoValid] = React.useState(false);
  const [promoLoading, setPromoLoading] = React.useState(false);

  // Level discount (1% per level, max 15%)
  const levelDiscount = Math.min(user?.level || 1, 15);
  
  // Calculate totals with discounts
  const subtotal = total;
  const levelDiscountAmount = subtotal * (levelDiscount / 100);
  const afterLevelDiscount = subtotal - levelDiscountAmount;
  const promoDiscountAmount = afterLevelDiscount * (promoDiscount / 100);
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
                  key={`${item.product_id}-${item.size}-${item.color}`}
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
                        onClick={() => removeItem(item.product_id, item.size, item.color)}
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
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size, item.color)}
                          data-testid={`qty-minus-${item.product_id}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-bold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size, item.color)}
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cart.items')} ({items.length})</span>
                    <span className="font-bold">{subtotal}</span>
                  </div>
                  
                  {/* Level Discount */}
                  {levelDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {t('cart.levelDiscount')} ({levelDiscount}%)
                      </span>
                      <span className="font-bold">-{levelDiscountAmount.toFixed(0)}</span>
                    </div>
                  )}
                  
                  {/* Promo Discount */}
                  {promoValid && promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {t('cart.promoDiscount')} ({promoDiscount}%)
                      </span>
                      <span className="font-bold">-{promoDiscountAmount.toFixed(0)}</span>
                    </div>
                  )}
                  
                  {/* Total Saved */}
                  {totalSaved > 0 && (
                    <div className="p-2 bg-green-50 rounded-lg text-center">
                      <span className="text-green-700 font-bold">{t('cart.youSave')}: {totalSaved}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-primary">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      {t('cart.xpToEarn')}
                    </span>
                    <span className="font-bold">+{totalXP}</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-xl">
                      <span className="font-bold">{t('cart.total')}</span>
                      <span className="font-black text-primary">{finalTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mb-4">
                  <label className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    {t('cart.promoCode')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoValid(false);
                        setPromoDiscount(0);
                      }}
                      placeholder={t('cart.enterPromo')}
                      className="tsmarket-input flex-1"
                      disabled={promoValid}
                      data-testid="promo-input"
                    />
                    <Button
                      type="button"
                      variant={promoValid ? "outline" : "default"}
                      onClick={() => {
                        if (promoValid) {
                          setPromoCode('');
                          setPromoValid(false);
                          setPromoDiscount(0);
                        } else {
                          validatePromo();
                        }
                      }}
                      disabled={promoLoading || (!promoValid && !promoCode.trim())}
                      className="rounded-full"
                    >
                      {promoValid ? t('cart.remove') : t('cart.apply')}
                    </Button>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="mb-4">
                  <label className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    {t('cart.phoneNumber')} *
                  </label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+992 XXX XX XX XX"
                    className="tsmarket-input"
                    data-testid="phone-input"
                  />
                </div>

                {/* Delivery Address */}
                <div className="mb-4">
                  <label className="text-sm font-bold mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t('cart.deliveryAddress')} *
                  </label>
                  <Textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={t('cart.addressPlaceholder')}
                    className="tsmarket-input min-h-[80px]"
                    data-testid="delivery-address"
                  />
                </div>

                {/* Balance Info */}
                {isAuthenticated && (
                  <div className={`p-3 rounded-xl mb-4 ${insufficientBalance ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        {t('cart.yourBalance')}
                      </span>
                      <span className={`font-bold ${insufficientBalance ? 'text-destructive' : 'text-primary'}`}>
                        {user?.balance?.toFixed(0) || 0}
                      </span>
                    </div>
                    {insufficientBalance && (
                      <p className="text-xs text-destructive mt-2">
                        {t('cart.needMore')} {(finalTotal - (user?.balance || 0)).toFixed(0)} {t('cart.moreCoins')}
                      </p>
                    )}
                  </div>
                )}

                {insufficientBalance ? (
                  <Link to="/topup">
                    <Button className="w-full tsmarket-btn-secondary rounded-full py-6" data-testid="topup-btn">
                      <Wallet className="w-5 h-5 mr-2" />
                      {t('cart.topUpBalance')}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full tsmarket-btn-primary rounded-full py-6"
                    onClick={handleCheckout}
                    disabled={loading || items.length === 0 || !deliveryAddress.trim() || !phoneNumber.trim()}
                    data-testid="checkout-btn"
                  >
                    {loading ? (
                      <span className="loading-spinner" />
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {t('cart.checkout')}
                      </>
                    )}
                  </Button>
                )}
                <Link to="/catalog">
                  <Button variant="ghost" className="w-full mt-4" data-testid="continue-shopping-btn">
                    {t('cart.continueShopping')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
