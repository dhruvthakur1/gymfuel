import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import Layout, { RequireAuth } from './components/Layout.jsx';
import Shop from './pages/Shop.jsx';
import ProductPage from './pages/ProductPage.jsx';
import Cart from './pages/Cart.jsx';
import { Login, Register } from './pages/Auth.jsx';
import { MockCheckout, OrderDetail, OrderList } from './pages/Orders.jsx';
import Admin from './pages/admin/Admin.jsx';
import './styles.css';

function NotFound() {
  return (
    <div className="empty">
      <h1>404</h1>
      <p className="muted">That page skipped leg day.</p>
      <Link to="/" className="btn btn-primary">Back to the shop</Link>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Shop />} />
              <Route path="products/:slug" element={<ProductPage />} />
              <Route path="cart" element={<Cart />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="orders" element={<RequireAuth><OrderList /></RequireAuth>} />
              <Route path="orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
              <Route path="checkout/mock" element={<RequireAuth><MockCheckout /></RequireAuth>} />
              <Route path="admin" element={<RequireAuth role="admin"><Admin /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
