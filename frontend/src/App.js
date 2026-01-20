import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Auth, AuthCallback } from './pages/Auth';
import { Cart } from './pages/Cart';
import { Profile } from './pages/Profile';
import { TopUp } from './pages/TopUp';
import { Rewards } from './pages/Rewards';
import { Admin } from './pages/Admin';
import { Helper } from './pages/Helper';
import { Support } from './pages/Support';
import { OrderTracking } from './pages/OrderTracking';
import { Missions } from './pages/Missions';
import './App.css';

// Component to handle auth callback detection
const AppRouter = () => {
  const location = useLocation();
  
  // Check URL fragment for session_id (Google OAuth callback)
  // This must happen SYNCHRONOUSLY during render to prevent race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  // Check if on admin page to hide navbar/footer
  const isAdminPage = location.pathname === '/admin' || location.pathname === '/helper';

  return (
    <>
      {!isAdminPage && <Navbar />}
      <main className={isAdminPage ? '' : 'min-h-screen'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/topup" element={<TopUp />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/support" element={<Support />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/helper" element={<Helper />} />
          <Route path="/order/:orderId" element={<OrderTracking />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <AppRouter />
            <Toaster 
              position="top-right" 
              richColors 
              toastOptions={{
                style: {
                  fontFamily: 'Outfit, sans-serif',
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
