import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { CATEGORY_LABELS, formatPrice } from '../format.js';
import { useCart } from '../context/CartContext.jsx';
import ProductArt from '../components/ProductArt.jsx';
import { ErrorNote, QuantityStepper, Spinner, Stars } from '../components/ui.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [flavor, setFlavor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(null);
    setError(null);
    api(`/products/${slug}`)
      .then(({ product }) => {
        setProduct(product);
        setFlavor(product.flavors[0] || '');
        setQuantity(1);
      })
      .catch(setError);
  }, [slug]);

  if (error) {
    return (
      <div className="empty">
        <ErrorNote error={error} />
        <Link to="/" className="btn btn-ghost">Back to the shop</Link>
      </div>
    );
  }
  if (!product) return <Spinner />;

  const outOfStock = product.stock === 0;

  function onAdd() {
    add(product, quantity, flavor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="product-page">
      <nav className="crumbs muted small">
        <Link to="/">Shop</Link> / <Link to={`/?category=${product.category}`}>{CATEGORY_LABELS[product.category]}</Link> / {product.name}
      </nav>

      <div className="product-layout">
        <div className="product-art-large card">
          <ProductArt product={product} />
        </div>

        <div className="product-info">
          <span className="eyebrow">{product.brand}</span>
          <h1>{product.name}</h1>
          <Stars rating={product.rating} count={product.reviewCount} />
          <p className="price price-lg">{formatPrice(product.price)}</p>
          <p className="muted small">{product.size} · Inclusive of all taxes</p>

          {product.flavors.length > 0 && (
            <div className="field">
              <span className="label">Flavour</span>
              <div className="chips">
                {product.flavors.map((f) => (
                  <button key={f} className={`chip ${flavor === f ? 'is-active' : ''}`} onClick={() => setFlavor(f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {outOfStock ? (
            <div className="alert">Out of stock — check back soon.</div>
          ) : (
            <>
              <p className={`small ${product.stock <= 5 ? 'warn' : 'ok'}`}>
                {product.stock <= 5 ? `Hurry, only ${product.stock} left` : 'In stock, ships in 24 hours'}
              </p>
              <div className="buy-row">
                <QuantityStepper value={quantity} max={Math.min(product.stock, 20)} onChange={(q) => setQuantity(Math.max(1, q))} />
                <button className="btn btn-primary btn-lg" onClick={onAdd}>
                  {added ? '✓ Added to cart' : 'Add to cart'}
                </button>
              </div>
              {added && (
                <Link to="/cart" className="small accent">
                  View cart →
                </Link>
              )}
            </>
          )}

          <div className="product-desc">
            <h4>About this product</h4>
            <p>{product.description}</p>
            <div className="chips">
              {product.tags.map((t) => (
                <Link key={t} to={`/?q=${encodeURIComponent(t)}`} className="tag-link">#{t}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
