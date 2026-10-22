import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../format.js';

const CART_KEY = 'gymfuel_cart';
const CartContext = createContext(null);

const lineKey = (productId, flavor) => `${productId}:${flavor || ''}`;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((product, quantity = 1, flavor = '') => {
    setItems((current) => {
      const key = lineKey(product.id, flavor);
      const existing = current.find((i) => i.key === key);
      if (existing) {
        return current.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock, 20) } : i));
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          size: product.size,
          price: product.price,
          stock: product.stock,
          flavor,
          quantity: Math.min(quantity, product.stock, 20),
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setItems((current) =>
      quantity <= 0 ? current.filter((i) => i.key !== key) : current.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, i.stock, 20) } : i))
    );
  }, []);

  const remove = useCallback((key) => setItems((current) => current.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    // Display-only totals; the server recalculates everything at checkout.
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, count, subtotal, shipping, total: subtotal + shipping, add, setQuantity, remove, clear };
  }, [items, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
