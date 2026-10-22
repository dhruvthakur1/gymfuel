import { Link } from 'react-router-dom';
import { formatPrice } from '../format.js';
import ProductArt from './ProductArt.jsx';

export function Stars({ rating, count }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      <span className="stars-track">
        ★★★★★
        <span className="stars-fill" style={{ width: `${(rating / 5) * 100}%` }}>★★★★★</span>
      </span>
      {count !== undefined && <span className="muted">({count.toLocaleString('en-IN')})</span>}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error.message || String(error)}</div>;
}

export function ProductCard({ product }) {
  const outOfStock = product.stock === 0;
  return (
    <Link to={`/products/${product.slug}`} className={`card product-card ${outOfStock ? 'is-out' : ''}`}>
      <div className="product-card-art">
        <ProductArt product={product} />
        {product.featured && <span className="tag tag-hot">Bestseller</span>}
        {outOfStock && <span className="tag tag-out">Out of stock</span>}
        {!outOfStock && product.stock <= 5 && <span className="tag tag-low">Only {product.stock} left</span>}
      </div>
      <div className="product-card-body">
        <span className="eyebrow">{product.brand}</span>
        <h3>{product.name}</h3>
        <Stars rating={product.rating} count={product.reviewCount} />
        <div className="product-card-foot">
          <strong className="price">{formatPrice(product.price)}</strong>
          <span className="muted small">{product.size}</span>
        </div>
      </div>
    </Link>
  );
}

export function QuantityStepper({ value, max, onChange }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity">−</button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}
