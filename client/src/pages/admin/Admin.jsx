import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { CATEGORY_LABELS, formatDate, formatPrice } from '../../format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorNote, Spinner, StatusBadge } from '../../components/ui.jsx';

const NEXT_STATUSES = {
  pending: ['cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');

  return (
    <div className="admin">
      <div className="admin-head">
        <h1>Admin dashboard</h1>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'is-active' : ''} onClick={() => setTab('orders')}>Orders</button>
          <button role="tab" aria-selected={tab === 'products'} className={tab === 'products' ? 'is-active' : ''} onClick={() => setTab('products')}>Products</button>
        </div>
      </div>
      {user.isDemo && (
        <div className="alert">You're signed in as the read-only demo admin. You can look around, but changes are disabled.</div>
      )}
      {tab === 'orders' ? <OrdersPanel readOnly={user.isDemo} /> : <ProductsPanel readOnly={user.isDemo} />}
    </div>
  );
}

function OrdersPanel({ readOnly }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api('/orders', { query: { status, page } }).then(setData).catch(setError);
  }, [status, page]);
  useEffect(load, [load]);

  async function changeStatus(order, next) {
    setError(null);
    try {
      await api(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: next } });
      load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      {data && (
        <div className="stats">
          <div className="card stat"><span className="muted small">Revenue</span><strong>{formatPrice(data.stats.revenue)}</strong></div>
          <div className="card stat"><span className="muted small">Paid orders</span><strong>{data.stats.paidOrders}</strong></div>
          <div className="card stat"><span className="muted small">{status ? `${status} orders` : 'All orders'}</span><strong>{data.total}</strong></div>
        </div>
      )}

      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.keys(NEXT_STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <ErrorNote error={error} />
      {!data ? (
        <Spinner />
      ) : data.orders.length === 0 ? (
        <p className="muted">No orders yet. Place one from the shop to see it here.</p>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th className="num">Total</th><th>Status</th><th>Update</th></tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/orders/${o.id}`} className="accent">#{o.id.slice(-6).toUpperCase()}</Link></td>
                  <td>{o.user?.name}<br /><span className="muted small">{o.user?.email}</span></td>
                  <td className="small">{formatDate(o.createdAt)}</td>
                  <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="num">{formatPrice(o.total)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    {NEXT_STATUSES[o.status].length > 0 ? (
                      <select value="" disabled={readOnly} onChange={(e) => changeStatus(o, e.target.value)} aria-label="Change status">
                        <option value="" disabled>Mark as…</option>
                        {NEXT_STATUSES[o.status].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <nav className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="muted">Page {page} of {data.pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>
      )}
    </>
  );
}

const emptyProduct = {
  name: '', slug: '', brand: '', category: 'protein', description: '', price: '', size: '', flavors: '', tags: '', stock: '', featured: false,
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function toForm(p) {
  return { ...p, price: String(p.price / 100), stock: String(p.stock), flavors: p.flavors.join(', '), tags: p.tags.join(', ') };
}

function fromForm(f) {
  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  return {
    name: f.name, slug: f.slug, brand: f.brand, category: f.category, description: f.description, size: f.size,
    price: Math.round(Number(f.price) * 100), stock: Number(f.stock), flavors: list(f.flavors), tags: list(f.tags), featured: f.featured,
  };
}

function ProductsPanel({ readOnly }) {
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [form, setForm] = useState(emptyProduct);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api('/products', { query: { limit: 50, sort: 'newest' } }).then((d) => setProducts(d.items)).catch(setError);
  }, []);
  useEffect(load, [load]);

  function startEdit(product) {
    setError(null);
    setEditing(product || 'new');
    setForm(product ? toForm(product) : emptyProduct);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = fromForm(form);
      if (editing === 'new') await api('/products', { method: 'POST', body });
      else await api(`/products/${editing.id}`, { method: 'PATCH', body });
      setEditing(null);
      load();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err);
    }
  }

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value, ...(field === 'name' && editing === 'new' ? { slug: slugify(value) } : {}) }));
  };

  return (
    <>
      <div className="toolbar">
        <p className="muted">{products ? `${products.length} products` : ''}</p>
        <button className="btn btn-primary btn-sm" onClick={() => startEdit(null)} disabled={readOnly}>+ New product</button>
      </div>

      {editing && (
        <form className="card product-form" onSubmit={save}>
          <h3>{editing === 'new' ? 'New product' : `Edit ${editing.name}`}</h3>
          <div className="form-grid">
            <label className="field"><span className="label">Name</span><input required value={form.name} onChange={set('name')} /></label>
            <label className="field"><span className="label">Slug</span><input required value={form.slug} onChange={set('slug')} /></label>
            <label className="field"><span className="label">Brand</span><input required value={form.brand} onChange={set('brand')} /></label>
            <label className="field">
              <span className="label">Category</span>
              <select value={form.category} onChange={set('category')}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="field"><span className="label">Price (₹)</span><input required type="number" min="0" step="1" value={form.price} onChange={set('price')} /></label>
            <label className="field"><span className="label">Stock</span><input required type="number" min="0" step="1" value={form.stock} onChange={set('stock')} /></label>
            <label className="field"><span className="label">Size</span><input value={form.size} onChange={set('size')} placeholder="2 kg" /></label>
            <label className="field"><span className="label">Flavours (comma separated)</span><input value={form.flavors} onChange={set('flavors')} /></label>
            <label className="field span-2"><span className="label">Tags (comma separated)</span><input value={form.tags} onChange={set('tags')} /></label>
            <label className="field span-2"><span className="label">Description</span><textarea rows={3} value={form.description} onChange={set('description')} /></label>
            <label className="checkbox"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured</label>
          </div>
          <ErrorNote error={error} />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
          </div>
        </form>
      )}

      {!editing && <ErrorNote error={error} />}
      {!products ? (
        <Spinner />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th /></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/products/${p.slug}`}><strong>{p.name}</strong></Link>
                    <br /><span className="muted small">{p.brand}{p.featured && ' · Featured'}</span>
                  </td>
                  <td>{CATEGORY_LABELS[p.category]}</td>
                  <td className="num">{formatPrice(p.price)}</td>
                  <td className={`num ${p.stock === 0 ? 'warn' : ''}`}>{p.stock}</td>
                  <td className="actions">
                    <button className="link-button small" onClick={() => startEdit(p)} disabled={readOnly}>Edit</button>
                    <button className="link-button small danger" onClick={() => remove(p)} disabled={readOnly}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
