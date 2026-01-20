import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_tsmarket-shop/artifacts/ku1akclq_%D0%BB%D0%BE%D0%B3%D0%BE.jpg";

export const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-foreground text-background py-16" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={LOGO_URL} alt="TSMarket" className="h-12 w-12 rounded-full object-cover" />
              <span className="font-bold text-2xl text-primary">
                {t('common.storeName')}
              </span>
            </div>
            <p className="text-background/70 max-w-md">
              {t('footer.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/catalog" className="text-background/70 hover:text-primary transition-colors">
                  {t('nav.catalog')}
                </Link>
              </li>
              <li>
                <Link to="/rewards" className="text-background/70 hover:text-primary transition-colors">
                  {t('nav.rewards')}
                </Link>
              </li>
              <li>
                <Link to="/topup" className="text-background/70 hover:text-primary transition-colors">
                  {t('nav.topup')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.account')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-background/70 hover:text-primary transition-colors">
                  {t('nav.profile')}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-background/70 hover:text-primary transition-colors">
                  {t('nav.cart')}
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-background/70 hover:text-primary transition-colors">
                  {t('nav.login')} / {t('nav.register')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="text-background/50 text-sm">
            © {new Date().getFullYear()} {t('common.storeName')}. {t('footer.rights')}.
          </p>
        </div>
      </div>
    </footer>
  );
};
