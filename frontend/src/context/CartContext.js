import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1, size = null) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product_id === product.product_id && item.size === size
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [
        ...prev,
        {
          product_id: product.product_id,
          product,
          quantity,
          size,
        },
      ];
    });
  };

  const removeItem = (productId, size = null) => {
    setItems((prev) =>
      prev.filter((item) => !(item.product_id === productId && item.size === size))
    );
  };

  const updateQuantity = (productId, quantity, size = null) => {
    if (quantity <= 0) {
      removeItem(productId, size);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId && item.size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const totalXP = items.reduce(
    (sum, item) => sum + (item.product?.xp_reward || 0) * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    totalXP,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
