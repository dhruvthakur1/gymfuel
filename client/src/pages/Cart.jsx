import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { FREE_SHIPPING_THRESHOLD, categoryColor, formatPrice } from '../format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { ErrorNote, QuantityStepper } from '../components/ui.jsx';

const ADDRESS_KEY = 'gymfuel_address';
const emptyAddress = { fullName: '', line1: '', city: '', state: '', postalCode: '', phone: '' };

function loadAddress() {
  try {
    return { ...emptyAddress, ...JSON.parse(localStorage.getItem(ADDRESS_KEY)) };
  } catch {
    return emptyAddress;
  }
}

export default function Cart() {
  const { user } = useAuth();
  const cart = useCart();
  const [params] = useSearchParams();
  const [address, setAddress] = useState(loadAddress);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));

  async function onCheckout(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
    try {
      const { url } = await api('/orders/checkout', {
        method: 'POST',
        body: {
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, flavor: i.flavor || undefined })),
          shippingAddress: address,
        },
      });
      // Stripe Checkout (or the mock payment page when Stripe isn't configured).
      window.location.assign(url);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty">
        <h2>Your cart is empty</h2>
        <p className="muted">Time to stock up on gains.</p>
        <Link to="/" className="btn btn-primary">Browse products</Link>
      </div>
    );
  }

  const toFreeShipping = FREE_SHIPPING_THRESHOLD - cart.subtotal;

  return (
    <div className="cart-page">
      <h1>Your cart</h1>
      {params.get('checkout') === 'cancelled' && (
        <div className="alert">Payment was cancelled — your cart is still here whenever you're ready.</div>
      )}

      <div className="cart-layout">
        <section className="card cart-items">
          {cart.items.map((item) => (
            <div key={item.key} className="cart-item">
              <Link to={`/products/${item.slug}`} className="cart-item-art" style={{ background: categoryColor(item.category).tint }}>
                <ProductArt product={item} />
              </Link>
              <div className="cart-item-info">
                <span className="eyebrow">{item.brand}</span>
                <Link to={`/products/${item.slug}`}><strong>{item.name}</strong></Link>
                <span className="muted small">{[item.flavor, item.size].filter(Boolean).join(' · ')}</span>
                <button className="link-button small" onClick={() => cart.remove(item.key)}>Remove</button>
              </div>
              <QuantityStepper value={item.quantity} max={Math.min(item.stock, 20)} onChange={(q) => cart.setQuantity(item.key, q)} />
              <strong className="cart-item-price">{formatPrice(item.price * item.quantity)}</strong>
            </div>
          ))}
        </section>

        <aside className="card summary">
          <h3>Order summary</h3>
          <dl>
            <dt>Subtotal</dt>
            <dd>{formatPrice(cart.subtotal)}</dd>
            <dt>Shipping</dt>
            <dd>{cart.shipping === 0 ? 'Free' : formatPrice(cart.shipping)}</dd>
            <dt className="total">Total</dt>
            <dd className="total">{formatPrice(cart.total)}</dd>
          </dl>
          {toFreeShipping > 0 && <p className="small accent">Add {formatPrice(toFreeShipping)} more for free shipping</p>}

          {user ? (
            <form onSubmit={onCheckout} className="address-form">
              <h4>Shipping address</h4>
              <input required placeholder="Full name" value={address.fullName} onChange={setField('fullName')} autoComplete="name" />
              <input required placeholder="Address" value={address.line1} onChange={setField('line1')} autoComplete="street-address" />
              <div className="row">
                <input required placeholder="City" value={address.city} onChange={setField('city')} autoComplete="address-level2" />
                <input required placeholder="State" value={address.state} onChange={setField('state')} autoComplete="address-level1" />
              </div>
              <div className="row">
                <input required placeholder="PIN code" inputMode="numeric" pattern="\d{6}" title="6-digit PIN code" value={address.postalCode} onChange={setField('postalCode')} autoComplete="postal-code" />
                <input required placeholder="Mobile" inputMode="tel" pattern="[6-9]\d{9}" title="10-digit mobile number" value={address.phone} onChange={setField('phone')} autoComplete="tel-national" />
              </div>
              <ErrorNote error={error} />
              <button className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                {submitting ? 'Redirecting to payment…' : `Pay ${formatPrice(cart.total)}`}
              </button>
              <p className="muted small test-hint">
                Test mode — pay with card <code>4242 4242 4242 4242</code>, any future date and any CVC.
              </p>
            </form>
          ) : (
            <Link to="/login?next=/cart" className="btn btn-primary btn-lg btn-block">Log in to check out</Link>
          )}
        </aside>
      </div>
    </div>
  );
}
