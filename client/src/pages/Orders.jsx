import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatPrice } from '../format.js';
import { useCart } from '../context/CartContext.jsx';
import { ErrorNote, Spinner, StatusBadge } from '../components/ui.jsx';

export function OrderList() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/orders/mine').then((d) => setOrders(d.orders)).catch(setError);
  }, []);

  if (error) return <ErrorNote error={error} />;
  if (!orders) return <Spinner />;

  return (
    <div className="orders-page">
      <h1>Your orders</h1>
      {orders.length === 0 ? (
        <div className="empty">
          <p className="muted">You haven't placed any orders yet.</p>
          <Link to="/" className="btn btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card order-row">
              <div>
                <strong>Order #{o.id.slice(-6).toUpperCase()}</strong>
                <span className="muted small">{formatDate(o.createdAt)}</span>
              </div>
              <span className="muted small">{o.items.reduce((n, i) => n + i.quantity, 0)} items</span>
              <StatusBadge status={o.status} />
              <strong>{formatPrice(o.total)}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { clear } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const polls = useRef(0);
  const justPaid = params.get('checkout') === 'success';

  useEffect(() => {
    if (justPaid) clear();
  }, [justPaid, clear]);

  useEffect(() => {
    let timer;
    let cancelled = false;
    async function load() {
      try {
        const { order } = await api(`/orders/${id}`);
        if (cancelled) return;
        setOrder(order);
        // After Stripe redirects back, the webhook may take a moment; poll briefly.
        if (justPaid && order.status === 'pending' && polls.current < 10) {
          polls.current += 1;
          timer = setTimeout(load, 2000);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, justPaid]);

  if (error) return <ErrorNote error={error} />;
  if (!order) return <Spinner />;

  const a = order.shippingAddress || {};

  return (
    <div className="order-detail">
      {justPaid && order.status === 'paid' && (
        <div className="alert alert-success">
          <strong>Payment received — thanks for your order!</strong> We'll email you when it ships.
        </div>
      )}
      {justPaid && order.status === 'pending' && <div className="alert">Confirming your payment…</div>}

      <div className="order-head">
        <div>
          <h1>Order #{order.id.slice(-6).toUpperCase()}</h1>
          <span className="muted small">Placed {formatDate(order.createdAt)}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="cart-layout">
        <section className="card">
          <table className="table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th className="num">Price</th></tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td>
                    {item.name}
                    {item.flavor && <span className="muted small"> · {item.flavor}</span>}
                  </td>
                  <td>{item.quantity}</td>
                  <td className="num">{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="card summary">
          <dl>
            <dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd>
            <dt>Shipping</dt><dd>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</dd>
            <dt className="total">Total</dt><dd className="total">{formatPrice(order.total)}</dd>
          </dl>
          <h4>Ship to</h4>
          <p className="muted small address">
            {a.fullName}<br />{a.line1}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}
          </p>
          {order.payment?.paidAt && <p className="muted small">Paid {formatDate(order.payment.paidAt)} via {order.payment.provider === 'stripe' ? 'Stripe' : 'simulated payment'}</p>}
        </aside>
      </div>
      <Link to="/orders" className="small accent">← All orders</Link>
    </div>
  );
}

// Stands in for Stripe Checkout when the API has no Stripe key (local development).
export function MockCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('order');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api(`/orders/${orderId}`).then((d) => setOrder(d.order)).catch(setError);
  }, [orderId]);

  async function pay() {
    setPaying(true);
    try {
      await api(`/orders/${orderId}/mock-pay`, { method: 'POST' });
      navigate(`/orders/${orderId}?checkout=success`, { replace: true });
    } catch (err) {
      setError(err);
      setPaying(false);
    }
  }

  if (error) return <ErrorNote error={error} />;
  if (!order) return <Spinner />;

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <span className="eyebrow accent">Simulated payment</span>
        <h1>{formatPrice(order.total)}</h1>
        <p className="muted small">
          Stripe isn't configured on this server, so this page simulates the payment step. Set
          <code> STRIPE_SECRET_KEY</code> to use real Stripe Checkout in test mode.
        </p>
        <button className="btn btn-primary btn-block" onClick={pay} disabled={paying || order.status !== 'pending'}>
          {paying ? 'Processing…' : 'Simulate successful payment'}
        </button>
        <Link to="/cart?checkout=cancelled" className="btn btn-ghost btn-block">Cancel</Link>
      </div>
    </div>
  );
}
