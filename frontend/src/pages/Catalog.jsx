import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { productsAPI, categoriesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Search, Filter, X, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Use global cache if available, otherwise use local object
const getCache = () => {
  try {
    return window.__CATALOG_CACHE__ || { products: null, categories: null, timestamp: 0 };
  } catch (e) {
    return { products: null, categories: null, timestamp: 0 };
  }
};

const setCache = (data) => {
  try {
    window.__CATALOG_CACHE__ = { ...getCache(), ...data };
  } catch (e) {}
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
      <div className="p-3 md:p-4">
        <h3 className="font-bold text-sm md:text-lg line-clamp-1">{getLocalizedText(product, 'name', lang)}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg md:text-2xl font-black text-primary">{product.price}</span>
          <Button size="sm" onClick={() => addItem(product)} className="rounded-full w-8 h-8 md:w-10 md:h-10 p-0">
            <ShoppingCart className="w-3 h-3 md:w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

const ProductMarquee = React.memo(({ products, lang }) => {
  const marqueeProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    // Only duplicate if we have products
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
  
  // Initialize from cache if available
  const initialCache = getCache();
  const [products, setProducts] = useState(initialCache.products || []);
  const [categories, setCategories] = useState(initialCache.categories || []);
  const [loading, setLoading] = useState(!initialCache.products);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState('default');
  const ITEMS_PER_PAGE = 12;
  
  const initialFetchRef = useRef(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minXP, setMinXP] = useState(0);
  
  // UI State for category accordion
  const [expandedParents, setExpandedParents] = useState({});

  useEffect(() => {
    const fetchCategories = async () => {
      const cache = getCache();
      // Use cache if fresh
      if (cache.categories && Date.now() - cache.timestamp < CACHE_DURATION) {
        return;
      }
      try {
        const res = await categoriesAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : [];
        setCategories(data);
        setCache({ categories: data, timestamp: Date.now() });
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
    
    // Fetch active theme
    const fetchTheme = async () => {
      try {
        const settingsRes = await supportAPI.getSettings();
        if (settingsRes?.data?.active_theme) {
          setActiveThemeId(settingsRes.data.active_theme);
        }
      } catch (e) {}
    };
    fetchTheme();
  }, []);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    
    // Auto-expand parent if a subcategory is selected
    if (category !== 'all' && categories.length > 0) {
      const selectedCat = categories.find(c => c.category_id === category);
      if (selectedCat && selectedCat.parent_id) {
        setExpandedParents(prev => ({
          ...prev,
          [selectedCat.parent_id]: true
        }));
      }
    }
  }, [search, category, priceRange, minXP, categories]);

  useEffect(() => {
    const fetchProducts = async () => {
      const isInitial = page === 0;
      const cache = getCache();
      const isCacheFresh = cache.products && Date.now() - cache.timestamp < CACHE_DURATION;
      
      // If we have cached products and it's the first page of a fresh load, skip loading state
      if (isInitial && isCacheFresh && !initialFetchRef.current && !search && category === 'all' && priceRange[0] === 0 && priceRange[1] === 10000 && minXP === 0) {
        setLoading(false);
        initialFetchRef.current = true;
        return;
      }

      if (isInitial) {
        setLoading(true);
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
        
        setProducts(prev => {
          const updated = isInitial ? newProducts : [...prev, ...newProducts];
          // Update cache on initial page load if no filters
          if (isInitial && !search && category === 'all') {
            setCache({ products: updated, timestamp: Date.now() });
          }
          return updated;
        });
      } catch (error) {
        console.error('Failed to fetch products:', error);
        if (isInitial) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        initialFetchRef.current = true;
      }
    };
    
    const delay = search ? 300 : 0;
    const debounce = setTimeout(fetchProducts, delay);
    return () => clearTimeout(debounce);
  }, [search, category, priceRange, minXP, page]);

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    addItem(product);
    toast.success(`${getLocalizedText(product, 'name', lang)} added to cart!`);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setPriceRange([0, 10000]);
    setMinXP(0);
    setPage(0);
    setSearchParams({});
  };

  const toggleParent = (catId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedParents(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const hasActiveFilters = search || (category && category !== 'all') || priceRange[0] > 0 || priceRange[1] < 10000 || minXP > 0;

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const parentCategories = safeCategories.filter(cat => !cat.parent_id);

  return (
    <div className={`min-h-screen ${activeThemeId === 'default' ? 'tsmarket-gradient' : activeThemeId} py-8`} data-testid="catalog-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{t('catalog.title')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('catalog.subtitle')}
          </p>
        </div>

        {/* Product Marquee - Show even while loading if we have cached data */}
        {safeProducts.length > 0 && (
          <ProductMarquee products={safeProducts.slice(0, 10)} lang={lang} />
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
              <SelectSeparator />
              {parentCategories.map((parentCat) => {
                const subcats = safeCategories.filter(c => c.parent_id === parentCat.category_id);
                return (
                  <SelectGroup key={parentCat.category_id}>
                    <SelectLabel className="text-primary font-bold px-2 py-1.5 text-xs uppercase tracking-wider opacity-70">
                      {getLocalizedText(parentCat, 'name', lang)}
                    </SelectLabel>
                    <SelectItem value={parentCat.category_id} className="font-medium">
                      {getLocalizedText(parentCat, 'name', lang)} ({t('catalog.all')})
                    </SelectItem>
                    {subcats.map((subcat) => (
                      <SelectItem key={subcat.category_id} value={subcat.category_id} className="pl-6">
                        ↳ {getLocalizedText(subcat, 'name', lang)}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                  </SelectGroup>
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

              <div className="space-y-8">
                {/* Hierarchical Category Sidebar */}
                <div>
                  <label className="text-sm font-bold mb-4 block">{t('catalog.categories')}</label>
                  <div className="space-y-1">
                    <button
                      onClick={() => setCategory('all')}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                        category === 'all' ? 'bg-primary text-white font-bold' : 'hover:bg-muted'
                      }`}
                    >
                      {t('catalog.allCategories')}
                    </button>
                    
                    {parentCategories.map(parentCat => {
                      const subcats = safeCategories.filter(c => c.parent_id === parentCat.category_id);
                      const isExpanded = expandedParents[parentCat.category_id];
                      const isActive = category === parentCat.category_id;
                      
                      return (
                        <div key={parentCat.category_id} className="space-y-1">
                          <div className="flex items-center group">
                            <button
                              onClick={() => {
                                setCategory(parentCat.category_id);
                                if (subcats.length > 0) {
                                  toggleParent(parentCat.category_id);
                                }
                              }}
                              className={`flex-1 text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'
                              }`}
                            >
                              {getLocalizedText(parentCat, 'name', lang)}
                            </button>
                            {subcats.length > 0 && (
                              <button 
                                onClick={(e) => toggleParent(parentCat.category_id, e)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          
                          {isExpanded && subcats.length > 0 && (
                            <div className="pl-4 space-y-1 border-l-2 border-primary/10 ml-3">
                              {subcats.map(subcat => (
                                <button
                                  key={subcat.category_id}
                                  onClick={() => setCategory(subcat.category_id)}
                                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                    category === subcat.category_id ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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

                <div>
                  <label className="text-sm font-bold mb-4 block">
                    {t('catalog.priceRange')}: {priceRange[0]} - {priceRange[1]}
                  </label>
                  <Slider
                    defaultValue={[0, 10000]}
                    max={10000}
                    step={100}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold mb-4 block">
                    {t('catalog.minXP')}: {minXP} XP
                  </label>
                  <Slider
                    defaultValue={[0]}
                    max={1000}
                    step={50}
                    value={[minXP]}
                    onValueChange={(val) => setMinXP(val[0])}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            {loading && page === 0 && safeProducts.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="tsmarket-card p-4 space-y-4">
                    <div className="aspect-square skeleton rounded-2xl" />
                    <div className="h-4 skeleton w-3/4" />
                    <div className="h-8 skeleton w-1/2" />
                  </div>
                ))}
              </div>
            ) : safeProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {safeProducts.map((product) => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="mt-12 text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={loadingMore}
                      className="rounded-full px-8"
                      data-testid="load-more-btn"
                    >
                      {loadingMore ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                      ) : null}
                      {t('catalog.loadMore')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 tsmarket-card">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('catalog.noProducts')}</h3>
                <p className="text-muted-foreground mb-6">{t('catalog.tryAdjusting')}</p>
                <Button onClick={clearFilters} variant="outline" className="rounded-full">
                  {t('catalog.clearAll')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
