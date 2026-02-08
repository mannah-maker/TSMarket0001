import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { Delivery } from './pages/Delivery';
import { Support } from './pages/Support';
import { OrderTracking } from './pages/OrderTracking';
import { Missions } from './pages/Missions';
import './App.css';

// Protected Route for Delivery
const DeliveryRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return null;
  
  const isDelivery = user?.role === 'delivery' || user?.role === 'admin' || user?.is_admin;
  if (!isAuthenticated || !isDelivery) {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Component to restrict access for delivery personnel
const NonDeliveryRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return null;
  
  // Delivery drivers should ONLY access /delivery
  if (isAuthenticated && user?.role === 'delivery' && !user?.is_admin) {
    return <Navigate to="/delivery" />;
  }
  
  return children;
};

const AppRouter = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Check URL fragment for session_id (Google OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  // Check if on admin/delivery page to hide navbar/footer
  const isAdminPage = location.pathname === '/admin' || location.pathname === '/helper' || location.pathname === '/delivery';
  
  // For delivery drivers, we always want to show the delivery panel layout if they are on /delivery
  const isDeliveryUser = user?.role === 'delivery' && !user?.is_admin;

  return (
    <>
      {!isAdminPage && <Navbar />}
      <main className={isAdminPage ? '' : 'min-h-screen'}>
        <Routes>
          <Route path="/" element={<NonDeliveryRoute><Home /></NonDeliveryRoute>} />
          <Route path="/catalog" element={<NonDeliveryRoute><Catalog /></NonDeliveryRoute>} />
          <Route path="/product/:id" element={<NonDeliveryRoute><ProductDetail /></NonDeliveryRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/cart" element={<NonDeliveryRoute><Cart /></NonDeliveryRoute>} />
          <Route path="/profile" element={<NonDeliveryRoute><Profile /></NonDeliveryRoute>} />
          <Route path="/topup" element={<NonDeliveryRoute><TopUp /></NonDeliveryRoute>} />
          <Route path="/rewards" element={<NonDeliveryRoute><Rewards /></NonDeliveryRoute>} />
          <Route path="/missions" element={<NonDeliveryRoute><Missions /></NonDeliveryRoute>} />
          <Route path="/support" element={<NonDeliveryRoute><Support /></NonDeliveryRoute>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/helper" element={<Helper />} />
          <Route path="/delivery" element={<DeliveryRoute><Delivery /></DeliveryRoute>} />
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
