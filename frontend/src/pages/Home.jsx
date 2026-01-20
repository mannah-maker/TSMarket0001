import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { productsAPI, categoriesAPI, seedAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Sparkles, Trophy, Gift, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_tsmarket-shop/artifacts/ku1akclq_%D0%BB%D0%BE%D0%B3%D0%BE.jpg";
const HERO_IMAGE = "https://images.unsplash.com/photo-1636036769389-343bb250f013?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBzZXR1cCUyMHBlcmlwaGVyYWxzJTIwaGVhZHBob25lcyUyMGtleWJvYXJkJTIwbW91c2UlMjBuZW9uJTIwbGlnaHR8ZW58MHx8fHwxNzY3MjM5NjczfDA&ixlib=rb-4.1.0&q=85";

export const Home = () => {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed database first
        await seedAPI.seed().catch(() => {});
        
        const [productsRes, categoriesRes] = await Promise.all([
          productsAPI.getAll(),
          categoriesAPI.getAll(),
        ]);
        setProducts(productsRes.data.slice(0, 4));
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
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

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-section tsmarket-gradient relative" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-border">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm font-bold uppercase tracking-wider">{t('common.storeTagline')}</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
                <span className="text-green-500">TS</span>
                <span className="text-teal-500">Market</span>
                <br />
                <span className="text-foreground/80 text-3xl md:text-5xl">{t('home.heroSubtitle')}</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
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

            {/* Hero Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <img
                src={HERO_IMAGE}
                alt="Gaming Setup"
                className="relative rounded-3xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute -bottom-6 -left-6 animate-float">
                <img src={LOGO_URL} alt="TSMarket Dragon" className="w-24 h-24 rounded-2xl shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-20 tsmarket-gradient" data-testid="categories-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('home.categories')}</h2>
              <p className="text-lg text-muted-foreground">{t('catalog.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.category_id}
                  to={`/catalog?category=${category.category_id}`}
                  className="tsmarket-card p-6 text-center hover:border-primary/50 group"
                  data-testid={`category-${category.slug}`}
                >
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Products Section */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.product_id}
                  className="tsmarket-card tsmarket-card-hover product-card group"
                  data-testid={`product-${product.product_id}`}
                >
                  <Link to={`/product/${product.product_id}`}>
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="category-badge">{product.xp_reward} XP</span>
                    </div>
                    <Link to={`/product/${product.product_id}`}>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-2xl font-black text-primary">{product.price}</span>
                      <Button
                        size="sm"
                        className="tsmarket-btn-primary rounded-full"
                        onClick={() => handleAddToCart(product)}
                        data-testid={`add-to-cart-${product.product_id}`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link to="/catalog">
              <Button variant="outline" className="rounded-full font-bold" data-testid="view-all-mobile-btn">
                {t('home.viewAll')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-foreground text-background" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {t('home.readyToLevel')}
          </h2>
          <p className="text-xl text-background/70 mb-8">
            {t('home.readyDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {!isAuthenticated ? (
              <Link to="/auth?mode=register">
                <Button className="tsmarket-btn-primary rounded-full px-10 py-6 text-lg" data-testid="cta-register-btn">
                  {t('home.createAccount')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/catalog">
                <Button className="tsmarket-btn-primary rounded-full px-10 py-6 text-lg" data-testid="cta-shop-btn">
                  {t('home.shopNow')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
