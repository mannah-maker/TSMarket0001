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
  if (!item) return '';
  if (lang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
  if (lang === 'tj' && item[`${field}_tj`]) return item[`${field}_tj`];
  return item[field] || '';
};

export const Catalog = () => {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
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
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (category && category !== 'all') params.category = category;
        if (priceRange[0] > 0) params.min_price = priceRange[0];
        if (priceRange[1] < 10000) params.max_price = priceRange[1];
        if (minXP > 0) params.min_xp = minXP;
        
        const res = await productsAPI.getAll(params);
        setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [search, category, priceRange, minXP]);

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
    setSearchParams({});
  };

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const hasActiveFilters =
    search ||
    (category && category !== 'all') ||
    priceRange[0] > 0 ||
    priceRange[1] < 10000 ||
    minXP > 0;

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="catalog-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{t('catalog.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('catalog.subtitle')}</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('catalog.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 tsmarket-input"
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48 tsmarket-input">
              <SelectValue placeholder={t('catalog.allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('catalog.allCategories')}</SelectItem>
              {safeCategories.filter(cat => !cat.parent_id).map((parentCat) => {
                const subcats = safeCategories.filter(c => c.parent_id === parentCat.category_id);
                return (
                  <React.Fragment key={parentCat.category_id}>
                    <SelectItem value={parentCat.category_id}>
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
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('catalog.filters')}
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className={`w-64 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="tsmarket-card p-6 sticky top-24">
              <h3 className="font-bold text-lg mb-4">{t('catalog.filters')}</h3>

              {safeCategories.filter(cat => !cat.parent_id).map((parentCat) => {
                const subcats = safeCategories.filter(c => c.parent_id === parentCat.category_id);
                return (
                  <div key={parentCat.category_id}>
                    <button
                      onClick={() => setCategory(parentCat.category_id)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded"
                    >
                      {getLocalizedText(parentCat, 'name', lang)}
                    </button>
                    {subcats.map((subcat) => (
                      <button
                        key={subcat.category_id}
                        onClick={() => setCategory(subcat.category_id)}
                        className="ml-4 w-full text-left px-3 py-1 text-sm hover:bg-muted rounded"
                      >
                        {getLocalizedText(subcat, 'name', lang)}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Products */}
          <main className="flex-1">
            {loading ? (
              <div>Loading...</div>
            ) : safeProducts.length === 0 ? (
              <div className="empty-state">
                <Sparkles />
                <p>{t('catalog.noProducts')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {safeProducts.map((product) => (
                  <div key={product.product_id} className="tsmarket-card p-3">
                    <Link to={`/product/${product.product_id}`}>
                      <img
                        src={product.image_url}
                        alt={getLocalizedText(product, 'name', lang)}
                        className="w-full h-40 object-cover"
                      />
                    </Link>
                    <h3>{getLocalizedText(product, 'name', lang)}</h3>
                    <p>{product.price}</p>
                    <Button onClick={() => handleAddToCart(product)}>
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
