import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { productsAPI, categoriesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Search, Filter, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get localized text
const getLocalizedText = (item, field, lang) => {
  if (lang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
  if (lang === 'tj' && item[`${field}_tj`]) return item[`${field}_tj`];
  return item[field] || '';
};

const ProductCard = React.memo(({ product }) => {
  const { addItem } = useCart();
  const { lang } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="tsmarket-card tsmarket-card-hover product-card group">
      <Link to={`/product/${product.product_id}`}>
        <div className="aspect-square overflow-hidden relative bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-primary/10" />
          )}
          <img
            src={product.image_url}
            alt={getLocalizedText(product, 'name', lang)}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {product.in_stock === false && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10">
              {lang === 'ru' ? 'НЕТ В НАЛИЧИИ' : 'ДАР АНБОР НЕСТ'}
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <h3 className="font-bold text-lg line-clamp-1">{getLocalizedText(product, 'name', lang)}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xl font-black text-primary">{product.price}</span>
          <Button size="sm" onClick={() => addItem(product)} className="rounded-full w-10 h-10 p-0">
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

const ProductMarquee = React.memo(({ products, lang }) => {
  // Duplicate products to create a seamless loop
  const marqueeProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products, ...products, ...products];
  }, [products]);

  if (!products || products.length === 0) return null;
  
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold mb-4 px-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        {lang === 'ru' ? 'Новинки каталога' : 'Навгониҳои каталог'}
      </h2>
      <div className="marquee-container py-4 bg-white/30 backdrop-blur-sm rounded-3xl border border-white/20">
        <div className="animate-marquee gap-6 px-6">
          {marqueeProducts.map((product, idx) => (
            <Link 
              key={`${product.product_id}-${idx}`} 
              to={`/product/${product.product_id}`}
              className="w-40 h-40 shrink-0 tsmarket-card overflow-hidden hover:scale-105 transition-transform duration-300"
            >
              <img 
                src={product.image_url} 
                alt="" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

export const Catalog = () => {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 12;
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minXP, setMinXP] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
  }, [search, category, priceRange, minXP]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (page === 0) {
        setLoading(true);
        // Don't clear products immediately to avoid flicker, 
        // they will be replaced when new data arrives
      } else {
        setLoadingMore(true);
      }
      
      try {
        const params = {
          skip: page * ITEMS_PER_PAGE,
          limit: ITEMS_PER_PAGE
        };
        if (search) params.search = search;
        if (category && category !== 'all') params.category = category;
        if (priceRange[0] > 0) params.min_price = priceRange[0];
        if (priceRange[1] < 10000) params.max_price = priceRange[1];
        if (minXP > 0) params.min_xp = minXP;
        
        const res = await productsAPI.getAll(params);
        const newProducts = Array.isArray(res.data) ? res.data : res.data?.products || [];
        
        if (newProducts.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
        
        setProducts(prev => page === 0 ? newProducts : [...prev, ...newProducts]);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        if (page === 0) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    
    // Reduced debounce for search, immediate for other filters/pagination
    const delay = search ? 300 : (page === 0 ? 0 : 0);
    const debounce = setTimeout(fetchProducts, delay);
    return () => clearTimeout(debounce);
  }, [search, category, priceRange, minXP, page]);

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    addItem(product);
    toast.success(`${product.name} added to cart!`);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setPriceRange([0, 10000]);
    setMinXP(0);
    setPage(0);
    setSearchParams({});
  };

  const hasActiveFilters = search || (category && category !== 'all') || priceRange[0] > 0 || priceRange[1] < 10000 || minXP > 0;

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="catalog-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{t('catalog.title')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('catalog.subtitle')}
          </p>
        </div>

        {/* Product Marquee */}
        {!loading && products.length > 0 && (
          <ProductMarquee products={products.slice(0, 10)} lang={lang} />
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('catalog.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 tsmarket-input"
              data-testid="search-input"
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48 tsmarket-input" data-testid="category-select">
              <SelectValue placeholder={t('catalog.allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('catalog.allCategories')}</SelectItem>
              {safeCategories.filter(cat => !cat.parent_id).map((parentCat) => {
                const subcats = safeCategories.filter(c => c.parent_id === parentCat.category_id);
                return (
                  <React.Fragment key={parentCat.category_id}>
                    <SelectItem value={parentCat.category_id} className="font-medium">
                      {getLocalizedText(parentCat, 'name', lang)}
                    </SelectItem>
                    {subcats.map((subcat) => (
                      <SelectItem key={subcat.category_id} value={subcat.category_id} className="pl-6 text-sm">
                        ↳ {getLocalizedText(subcat, 'name', lang)}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="md:hidden rounded-full"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="filter-toggle-btn"
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('catalog.filters')}
          </Button>
        </div>

        <div className="flex gap-8">
          <aside className={`w-64 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="tsmarket-card p-6 sticky top-24" data-testid="filters-sidebar">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">{t('catalog.filters')}</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-destructive"
                    data-testid="clear-filters-btn"
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t('catalog.clear')}
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-bold mb-3 block">{t('home.categories')}</label>
                {/* Фильтр по цене */}
                <div className="mt-6">
                  <label className="text-sm font-bold mb-2 block">
                    {t('catalog.price')} ({priceRange[0]} - {priceRange[1]})
                  </label>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={10000}
                    step={100}
                    onValueChange={setPriceRange}
                  />
                </div>
                
                {/* Фильтр по XP */}
                <div className="mt-6">
                  <label className="text-sm font-bold mb-2 block">
                    {t('catalog.minXP')}
                  </label>
                  <Input
                    type="number"
                    value={minXP}
                    onChange={(e) => setMinXP(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      category === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    {t('catalog.allCategories')}
                  </button>
                  {safeCategories.filter(cat => !cat.parent_id).map((parentCat) => {
                    const subcats = safeCategories.filter(c => c.parent_id === parentCat.category_id);
                    return (
                      <div key={parentCat.category_id}>
                        <button
                          onClick={() => setCategory(parentCat.category_id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors font-medium ${
                            category === parentCat.category_id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                        >
                          {getLocalizedText(parentCat, 'name', lang)}
                        </button>
                        {subcats.length > 0 && (
                          <div className="ml-3 border-l-2 border-muted pl-2 mt-1 space-y-1">
                            {subcats.map((subcat) => (
                              <button
                                key={subcat.category_id}
                                onClick={() => setCategory(subcat.category_id)}
                                className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-sm ${
                                  category === subcat.category_id ? 'bg-primary/80 text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                                }`}
                              >
                                {getLocalizedText(subcat, 'name', lang)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-80 rounded-2xl" />
                ))}
              </div>
            ) : safeProducts.length === 0 ? (
              <div className="empty-state">
                <Sparkles className="empty-state-icon" />
                <h3 className="text-xl font-bold mb-2">{t('catalog.noProducts')}</h3>
                <p className="text-muted-foreground mb-4">{t('catalog.adjustFilters')}</p>
                <Button onClick={clearFilters} variant="outline" className="rounded-full">
                  {t('catalog.clear')}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {safeProducts.length} {t('catalog.productsFound')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {safeProducts.map((product) => <ProductCard key={product.product_id} product={product} />)}
                </div>

                {hasMore && (
                  <div className="mt-12 flex justify-center">
                    <Button 
                      onClick={() => setPage(prev => prev + 1)} 
                      disabled={loadingMore}
                      variant="outline"
                      className="rounded-full px-8"
                    >
                      {loadingMore ? t('common.loading') : t('catalog.loadMore') || 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
