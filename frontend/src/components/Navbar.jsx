import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { ShoppingCart, User, Menu, X, LogOut, Settings, Gift, Wallet, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_tsmarket-shop/artifacts/ku1akclq_%D0%BB%D0%BE%D0%B3%D0%BE.jpg";

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const { t, lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/catalog', label: t('nav.catalog') },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-border/50" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <img src={LOGO_URL} alt="TSMarket" className="h-10 w-10 rounded-full object-cover" loading="eager" />
              <span className="font-bold text-xl tracking-tight hidden sm:block">
                {t('common.storeName')}
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} className="nav-link" data-testid={`nav-${link.to.replace('/', '') || 'home'}`}>
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && (
                <>
                  <Link to="/rewards" className="nav-link" data-testid="nav-rewards">
                    {t('nav.rewards')}
                  </Link>
                  <Link to="/missions" className="nav-link" data-testid="nav-missions">
                    {lang === 'ru' ? 'Миссии' : 'Миссияҳо'}
                  </Link>
                </>
              )}
              <Link to="/support" className="nav-link" data-testid="nav-support">
                {lang === 'ru' ? 'Поддержка' : 'Дастгирӣ'}
              </Link>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="rounded-full font-bold"
                data-testid="lang-toggle"
              >
                <Globe className="w-4 h-4 mr-1" />
                {lang === 'ru' ? 'TJ' : 'RU'}
              </Button>

              {isAuthenticated && (
                <>
                  {/* Balance Display */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full" data-testid="balance-display">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">{user?.balance?.toFixed(0) || 0}</span>
                  </div>

                  {/* Cart */}
                  <Link to="/cart" className="relative p-2 hover:bg-muted rounded-full transition-colors" data-testid="cart-link">
                    <ShoppingCart className="w-5 h-5" />
                    {itemCount > 0 && (
                      <span className="cart-badge" data-testid="cart-badge">{itemCount}</span>
                    )}
                  </Link>
                </>
              )}

              {/* User Menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-full transition-colors" data-testid="user-menu-trigger">
                      {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-sm">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="font-bold truncate">{user?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="level-badge w-8 h-8 text-xs">
                          {user?.level || 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">{t('common.level')} {user?.level || 1}</p>
                          <p className="text-xs font-bold">{user?.xp || 0} XP</p>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer" data-testid="profile-link">
                        <User className="w-4 h-4" />
                        {t('nav.profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/topup" className="flex items-center gap-2 cursor-pointer" data-testid="topup-link">
                        <Wallet className="w-4 h-4" />
                        {t('nav.topup')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/rewards" className="flex items-center gap-2 cursor-pointer" data-testid="rewards-link">
                        <Gift className="w-4 h-4" />
                        {t('nav.rewards')}
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-destructive" data-testid="admin-link">
                            <Settings className="w-4 h-4" />
                            {t('nav.admin')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {user?.role === 'helper' && !isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-blue-400" data-testid="helper-link">
                            <Settings className="w-4 h-4" />
                            {lang === 'ru' ? 'Панель управления' : 'Панели идоракунӣ'}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive" data-testid="logout-btn">
                      <LogOut className="w-4 h-4" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="rounded-full font-bold" data-testid="login-btn">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/auth?mode=register" className="hidden sm:block">
                    <Button size="sm" className="tsmarket-btn-primary rounded-full px-6" data-testid="register-btn">
                      {t('nav.register')}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 hover:bg-muted rounded-full transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu md:hidden" data-testid="mobile-menu">
          <button
            className="absolute top-4 right-4 p-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="mobile-menu-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/support" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
            {lang === 'ru' ? 'Поддержка' : 'Дастгирӣ'}
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/rewards" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.rewards')}
              </Link>
              <Link to="/missions" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                {lang === 'ru' ? 'Миссии' : 'Миссияҳо'}
              </Link>
              <Link to="/profile" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.profile')}
              </Link>
              <Link to="/topup" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.topup')}
              </Link>
            </>
          )}
        </div>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
};
