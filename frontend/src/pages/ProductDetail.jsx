import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { productsAPI, reviewsAPI, gamificationAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShoppingCart, ArrowLeft, Sparkles, Package, Minus, Plus, 
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  Star, MessageSquare, Send, User
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get localized text
const getLocalizedText = (item, field, lang) => {
  if (!item) return '';
  if (lang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
  if (lang === 'tj' && item[`${field}_tj`]) return item[`${field}_tj`];
  return item[field] || '';
};

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [customRequest, setCustomRequest] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      try {
        const [prodRes, reviewsRes] = await Promise.all([
          productsAPI.getOne(id),
          reviewsAPI.getForProduct(id)
        ]);
        
        setProduct(prodRes.data);
        setReviews(reviewsRes.data);
        
        if (prodRes.data.sizes?.length > 0) {
          setSelectedSize(prodRes.data.sizes[0]);
        }
        if (prodRes.data.colors?.length > 0) {
          setSelectedColor(prodRes.data.colors[0]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Product not found');
        navigate('/catalog');
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndReviews();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/auth');
      return;
    }
    
    if (product.sizes?.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    if (product.colors?.length > 0 && !selectedColor) {
      toast.error(lang === 'ru' ? 'Пожалуйста, выберите цвет' : 'Лутфан рангро интихоб кунед');
      return;
    }
    
    addItem(product, quantity, selectedSize || null, selectedColor || null, customRequest || null);
    toast.success(`${getLocalizedText(product, 'name', lang)} ${lang === 'ru' ? 'добавлен в корзину!' : 'ба сабад илова шуд!'}`);
    setCustomRequest('');
  };


  const handleSparkle = async (reviewId) => {
    if (!isAuthenticated) {
      toast.error(t('product.pleaseLogin'));
      return;
    }
    try {
      const res = await gamificationAPI.sparkleReview(reviewId);
      // Update local state
      setReviews(prev => prev.map(rev => {
        if (rev.review_id === reviewId) {
          return {
            ...rev,
            is_sparkled: res.data.sparkled,
            sparkles: res.data.sparkled ? (rev.sparkles || 0) + 1 : Math.max(0, (rev.sparkles || 0) - 1)
          };
        }
        return rev;
      }));
    } catch (error) {
      console.error('Failed to sparkle review:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(t('product.pleaseLogin'));
      return;
    }
    if (!newReviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await reviewsAPI.create({
        product_id: id,
        rating: newReviewRating,
        comment: newReviewComment
      });
      setReviews([res.data, ...reviews]);
      setNewReviewComment('');
      setNewReviewRating(5);
      toast.success('Review added!');
    } catch (error) {
      console.error('Failed to add review:', error);
      toast.error('Failed to add review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const productImages = product?.images?.length > 0 ? product.images : [product?.image_url];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    setImageLoaded(false);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
    setImageLoaded(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen tsmarket-gradient py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="skeleton aspect-square rounded-3xl" />
            <div className="space-y-4">
              <div className="skeleton h-8 w-32 rounded-full" />
              <div className="skeleton h-12 w-3/4 rounded-lg" />
              <div className="skeleton h-24 w-full rounded-lg" />
              <div className="skeleton h-16 w-48 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-8 rounded-full"
          onClick={() => navigate(-1)}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {lang === 'ru' ? 'Назад' : 'Бозгашт'}
        </Button>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="aspect-square rounded-3xl overflow-hidden tsmarket-card relative bg-muted">
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-primary/10" />
                )}
                <img
                  src={productImages[currentImageIndex]}
                  alt={getLocalizedText(product, 'name', lang)}
                  onLoad={() => setImageLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  data-testid="product-image"
                />
              </div>
              
              {/* Navigation Arrows */}
              {productImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronLeft className="w-6 h-6 text-primary" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronRight className="w-6 h-6 text-primary" />
                  </button>
                </>
              )}

              {/* XP Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">+{product.xp_reward} XP</span>
              </div>
            </div>

            {/* Thumbnails Strip */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentImageIndex(idx);
                      setImageLoaded(false);
                    }}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      currentImageIndex === idx ? 'border-primary scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <span className="category-badge mb-4 inline-block" data-testid="product-category">
                {product.category_id}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight" data-testid="product-name">
                {getLocalizedText(product, 'name', lang)}
              </h1>
            </div>

            <p className="text-lg text-muted-foreground" data-testid="product-description">
              {getLocalizedText(product, 'description', lang)}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-black text-primary" data-testid="product-price">
                {product.price}
              </span>
              <span className="text-muted-foreground">{lang === 'ru' ? 'монет' : 'тангаҳо'}</span>
            </div>

            {/* XP Info */}
            <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary">{lang === 'ru' ? 'Получите' : 'Гиред'} {product.xp_reward} XP</p>
                <p className="text-sm text-muted-foreground">{lang === 'ru' ? 'За эту покупку' : 'Бо ин харид'}</p>
              </div>
            </div>

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div>
                <label className="text-sm font-bold mb-3 block">{lang === 'ru' ? 'Выберите размер' : 'Интихоби андоза'}</label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full tsmarket-input" data-testid="size-select">
                    <SelectValue placeholder={lang === 'ru' ? 'Выберите размер' : 'Интихоби андоза'} />
                  </SelectTrigger>
                  <SelectContent>
                    {product.sizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div>
                <label className="text-sm font-bold mb-3 block">{lang === 'ru' ? 'Выберите цвет' : 'Интихоби ранг'}</label>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-full border-2 transition-all font-bold text-sm ${
                        selectedColor === color 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-white hover:border-primary/50'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Request */}
            <div>
              <label className="text-sm font-bold mb-3 block">
                {t('product.customRequest')}
              </label>
              <Textarea
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                placeholder={t('product.customRequestPlaceholder')}
                className="tsmarket-input min-h-[80px] resize-none"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="text-sm font-bold mb-3 block">Quantity</label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  data-testid="qty-minus"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center" data-testid="qty-value">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="qty-plus"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stock Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {product.in_stock !== false ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 font-medium">{lang === 'ru' ? 'В наличии' : 'Дар анбор'}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-medium">{lang === 'ru' ? 'Нет в наличии' : 'Дар анбор нест'}</span>
                  </>
                )}
                <span className="text-muted-foreground ml-2">({product.stock} {lang === 'ru' ? 'шт.' : 'дона'})</span>
              </div>
              
              {product.in_stock === false && product.arrival_date && (
                <div className="flex items-center gap-2 text-sm p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-500">
                    {lang === 'ru' ? 'Ожидается прибытие:' : 'Интизори омадан:'} <strong>{product.arrival_date}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full tsmarket-btn-primary rounded-full py-6 text-lg"
              onClick={handleAddToCart}
              data-testid="add-to-cart-btn"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {product.in_stock !== false 
                ? `${lang === 'ru' ? 'В корзину' : 'Ба сабад'} - ${product.price * quantity} coins`
                : (lang === 'ru' ? 'Предзаказ' : 'Пешфармоиш')}
            </Button>

            {/* Total XP */}
            <p className="text-center text-sm text-muted-foreground">
              {lang === 'ru' ? 'Вы заработаете' : 'Шумо ба даст меоред'} <strong>{product.xp_reward * quantity} XP</strong> {lang === 'ru' ? 'всего' : 'дар маҷмӯъ'}
            </p>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-12">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              {t('product.reviews')} ({reviews.length})
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Review Form */}
            <div className="lg:col-span-1">
              <div className="tsmarket-card p-6 sticky top-24">
                <h3 className="text-xl font-bold mb-6">{t('product.addReview')}</h3>
                {isAuthenticated ? (
                  <form onSubmit={handleSubmitReview} className="space-y-6">
                    <div>
                      <label className="text-sm font-bold mb-3 block">{t('product.rating')}</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReviewRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star 
                              className={`w-8 h-8 ${star <= newReviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold mb-3 block">{t('product.comment')}</label>
                      <Textarea
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="..."
                        className="tsmarket-input min-h-[120px] resize-none"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full tsmarket-btn-primary rounded-full py-6"
                      disabled={submittingReview}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {t('product.submit')}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground">{t('product.pleaseLogin')}</p>
                    <Button 
                      variant="outline" 
                      className="rounded-full"
                      onClick={() => navigate('/auth')}
                    >
                      {lang === 'ru' ? 'Войти' : 'Вуруд'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.review_id} className="tsmarket-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold">{review.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))
              ) : (
                <div className="tsmarket-card p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">{t('product.noReviews')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
