import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { productsAPI, categoriesAPI, supportAPI, adminAPI, gamificationAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Sparkles, Trophy, Gift, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_tsmarket-shop/artifacts/ku1akclq_%D0%BB%D0%BE%D0%B3%D0%BE.jpg";
const HERO_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop";

const DEFAULT_THEME = {
  hero: HERO_IMAGE,
  gradient: 'tsmarket-gradient',
  titleColor: 'text-teal-500',
  tagline: '🛒 Лучший выбор товаров'
};

const getLocalizedText = (item, field, lang) => {
  if (lang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
  if (lang === 'tj' && item[`${field}_tj`]) return item[`${field}_tj`];
  return item[field] || '';
};

const ProductImage = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-primary/10" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
};

export const Home = () => {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThemeId, setActiveThemeId] = useState('default');
  const [themes, setThemes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activities, setActivities] = useState([]);

  const parentCategories = categories.filter(cat => !cat.parent_id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch data independently to avoid one failure blocking everything
        const productsRes = await productsAPI.getAll({ limit: 20 }).catch(e => {
          console.error("Products fetch error:", e);
          return { data: [] };
        });
        
        const categoriesRes = await categoriesAPI.getAll().catch(e => {
          console.error("Categories fetch error:", e);
          return { data: [] };
        });

        const settingsRes = await supportAPI.getSettings().catch(() => ({ data: { active_theme: 'default' } }));
        const themesRes = await adminAPI.getThemes().catch(() => ({ data: [] }));
        
        if (settingsRes?.data?.active_theme) {
          setActiveThemeId(settingsRes.data.active_theme);
        }
        if (themesRes?.data) {
          setThemes(themesRes.data);
        }
        
        const productsData = Array.isArray(productsRes?.data) ? productsRes.data : 
                            (Array.isArray(productsRes) ? productsRes : []);
        const categoriesData = Array.isArray(categoriesRes?.data) ? categoriesRes.data : 
                              (Array.isArray(categoriesRes) ? categoriesRes : []);
        
        console.log("Fetched products count:", productsData.length);

        // Filter popular products (e.g., those with higher XP or just take first 8)
        const popularProducts = [...productsData]
          .sort((a, b) => (b.xp_reward || 0) - (a.xp_reward || 0))
          .slice(0, 8);
          
        setProducts(popularProducts);
        setCategories(categoriesData);
        const leaderboardRes = await gamificationAPI.getLeaderboard().catch(() => ({ data: [] }));
        const activitiesRes = await gamificationAPI.getActivityFeed().catch(() => ({ data: [] }));
        setLeaderboard(leaderboardRes.data || []);
        setActivities(activitiesRes.data || []);


        try {
          window.__CATALOG_CACHE__ = {
            products: productsData,
            categories: categoriesData,
            timestamp: Date.now()
          };
        } catch (e) {}
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error(t('cart.empty'));
      return;
    }
    addItem(product);
    toast.success(`${product.name} ${t('catalog.addToCart')}!`);
  };

  const features = [
    { icon: Sparkles, titleKey: 'home.earnXP', descKey: 'home.earnXPDesc' },
    { icon: Trophy, titleKey: 'home.levelUp', descKey: 'home.levelUpDesc' },
    { icon: Gift, titleKey: 'home.spinWin', descKey: 'home.spinWinDesc' },
  ];

  const activeThemeData = themes.find(t => t.theme_id === activeThemeId);
  const theme = activeThemeData ? {
    hero: activeThemeData.hero_image,
    gradient: activeThemeData.gradient,
    titleColor: activeThemeData.title_color,
    tagline: activeThemeData.tagline
  } : DEFAULT_THEME;

  return (
    <div className="min-h-screen" data-testid="home-page">
      <section className={`hero-section ${theme.gradient} relative`} data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-border">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-900">{theme.tagline}</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
                <span className="text-green-500">TS</span>
                <span className={`${theme.titleColor}`}>Market</span>
                <br />
                <span className={`${activeThemeId === 'default' || activeThemeId === 'valentine' ? 'text-foreground/80' : 'text-white/80'} text-3xl md:text-5xl`}>{t('home.heroSubtitle')}</span>
              </h1>
              
              <p className={`text-lg ${activeThemeId === 'default' || activeThemeId === 'valentine' ? 'text-muted-foreground' : 'text-slate-300'} max-lg`}>
                {t('home.heroDescription')}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/catalog">
                  <Button className="tsmarket-btn-primary rounded-full px-8 py-6 text-lg" data-testid="shop-now-btn">
                    {t('home.shopNow')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/auth?mode=register">
                    <Button variant="outline" className="rounded-full px-8 py-6 text-lg font-bold" data-testid="join-btn">
                      {t('home.joinUs')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <img
                src={theme.hero}
                alt="Store Banner"
                className="relative rounded-3xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-500 aspect-video object-cover"
              />
              <div className="absolute -bottom-6 -left-6 animate-float">
                <img src={LOGO_URL} alt="TSMarket Dragon" className="w-24 h-24 rounded-2xl shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {t('home.whyUs')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('footer.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="tsmarket-card tsmarket-card-hover p-8 text-center group"
                data-testid={`feature-${index}`}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="py-20 tsmarket-gradient" data-testid="categories-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('home.categories')}</h2>
              <p className="text-lg text-muted-foreground">{t('catalog.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {parentCategories.map((category) => (
                <Link
                  key={category.category_id}
                  to={`/catalog?category=${category.category_id}`}
                  className="tsmarket-card p-6 text-center hover:border-primary/50 group"
                  data-testid={`category-${category.slug}`}
                >
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                    {getLocalizedText(category, 'name', lang)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{getLocalizedText(category, 'description', lang)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-white" data-testid="products-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{t('home.popularItems')}</h2>
              <p className="text-lg text-muted-foreground">{t('catalog.subtitle')}</p>
            </div>
            <Link to="/catalog">
              <Button variant="outline" className="rounded-full font-bold hidden md:flex" data-testid="view-all-btn">
                {t('home.viewAll')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {(products || []).map((product) => (
                <div
                  key={product.product_id}
                  className="tsmarket-card tsmarket-card-hover product-card group"
                  data-testid={`product-${product.product_id}`}
                >
                  <Link to={`/product/${product.product_id}`}>
                    <div className="aspect-square overflow-hidden relative bg-muted">
                      <ProductImage src={product.image_url} alt={product.name} />
                    </div>
                  </Link>
                  <div className="p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="category-badge text-[10px] md:text-xs">{product.xp_reward} XP</span>
                    </div>
                    <Link to={`/product/${product.product_id}`}>
                      <h3 className="font-bold text-sm md:text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground text-[10px] md:text-sm mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-lg md:text-2xl font-black text-primary">{product.price}</span>
                      <Button
                        size="sm"
                        className="tsmarket-btn-primary rounded-full w-8 h-8 md:w-10 md:h-10 p-0 flex items-center justify-center"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gamification & Social Sections */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Leaderboard */}
            <div className="tsmarket-card p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                {t('home.leaderboard')}
              </h2>
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index < 3 ? 'bg-yellow-500 text-white' : 'bg-slate-100'}`}>
                        {index + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {user.picture ? <img src={user.picture} alt={user.name} className="w-full h-full object-cover" /> : <span className="font-bold">{user.name[0]}</span>}
                      </div>
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">Lvl {user.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary">{user.xp} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="tsmarket-card p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Zap className="w-8 h-8 text-orange-500" />
                {t('home.activityFeed')}
              </h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {activities.map((activity) => (
                  <div key={activity.activity_id} className="p-4 rounded-xl border border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{activity.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(activity.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-600">{activity.description}</p>
                    <div className="mt-2">
                      {activity.activity_type === 'level_up' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Level Up!</span>}
                      {activity.activity_type === 'achievement' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Achievement</span>}
                      {activity.activity_type === 'purchase' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">New Purchase</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
