import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { productsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, ArrowLeft, Sparkles, Package, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await productsAPI.getOne(id);
        setProduct(res.data);
        if (res.data.sizes?.length > 0) {
          setSelectedSize(res.data.sizes[0]);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('Product not found');
        navigate('/catalog');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
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
    
    addItem(product, quantity, selectedSize || null);
    toast.success(`${getLocalizedText(product, 'name', lang)} ${lang === 'ru' ? 'добавлен в корзину!' : 'ба сабад илова шуд!'}`);
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

        <div className="grid md:grid-cols-2 gap-12">
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
                <label className="text-sm font-bold mb-3 block">Select Size</label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full tsmarket-input" data-testid="size-select">
                    <SelectValue placeholder="Choose a size" />
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
              Total XP: <span className="font-bold text-primary">+{product.xp_reward * quantity} XP</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
