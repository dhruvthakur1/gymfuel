import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { Spinner } from './ui.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function onSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="logo" aria-label="GymFuel home">
          <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#c6f432" />
            <path d="M36 8 18 36h12l-4 20 20-30H34z" fill="#0e0f11" />
          </svg>
          GYMFUEL
        </Link>

        <form className="nav-search" onSubmit={onSearch} role="search">
          <input
            type="search"
            placeholder="Search whey, creatine, brands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />
        </form>

        <nav className="nav-links">
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <NavLink to="/orders">Orders</NavLink>
              <button
                className="link-button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
          <NavLink to="/cart" className="cart-link">
            Cart
            {count > 0 && <span className="cart-count">{count}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>
            <strong>GymFuel</strong> is a portfolio project — payments run in Stripe test mode and no real orders are
            shipped. Brand names belong to their owners.
          </span>
          <span className="muted">React · Node.js · Express · MongoDB · Stripe</span>
        </div>
      </footer>
    </>
  );
}

export function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
