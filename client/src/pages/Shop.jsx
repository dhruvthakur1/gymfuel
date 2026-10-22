import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { CATEGORY_LABELS, categoryColor } from '../format.js';
import ProductArt from '../components/ProductArt.jsx';

const HERO_PRODUCT = { slug: 'hero', brand: 'GymFuel', category: 'protein', size: '2 kg' };
import { ErrorNote, ProductCard, Spinner } from '../components/ui.jsx';

const SORT_OPTIONS = [
  ['featured', 'Featured'],
  ['rating', 'Top rated'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['newest', 'Newest'],
];

const PRICE_CAPS = [
  ['', 'Any price'],
  ['100000', 'Under ₹1,000'],
  ['250000', 'Under ₹2,500'],
  ['500000', 'Under ₹5,000'],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [facets, setFacets] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const filters = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    brand: params.get('brand') || '',
    maxPrice: params.get('maxPrice') || '',
    inStock: params.get('inStock') || '',
    sort: params.get('sort') || 'featured',
    page: Number(params.get('page')) || 1,
  };
  const isFiltered = Boolean(filters.q || filters.category || filters.brand || filters.maxPrice || filters.inStock);

  useEffect(() => {
    api('/products/facets').then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api('/products', { query: { ...filters, limit: 12 } })
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  }

  return (
    <>
      {!isFiltered && filters.page === 1 && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">Sports nutrition</span>
              <h1>
                Fuel every rep.
                <br />
                <em>Recover better.</em>
              </h1>
              <p className="muted">
                Lab-tested whey, creatine and pre-workouts from the brands serious lifters trust. Free shipping on
                orders over ₹2,999.
              </p>
              <div className="hero-actions">
                <button className="btn btn-primary btn-lg" onClick={() => update({ sort: 'rating' })}>Shop bestsellers</button>
                <button className="btn btn-ghost btn-lg" onClick={() => update({ category: 'protein' })}>Explore protein</button>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <ProductArt product={HERO_PRODUCT} />
            </div>
          </section>

          <section className="hero-cats" aria-label="Shop by category">
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <button key={value} className="hero-cat" style={{ background: categoryColor(value).tint }} onClick={() => update({ category: value })}>
                <span>{label}</span>
                <span className="hero-cat-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </section>
        </>
      )}

      <div className={`shop ${!isFiltered && filters.page === 1 ? 'has-hero' : ''}`}>
        <aside className="filters" aria-label="Filters">
          <div className="filter-group">
            <h4>Category</h4>
            <button className={`chip ${!filters.category ? 'is-active' : ''}`} onClick={() => update({ category: '' })}>
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <button
                key={value}
                className={`chip ${filters.category === value ? 'is-active' : ''}`}
                onClick={() => update({ category: value })}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="filter-group">
            <h4>Brand</h4>
            <select value={filters.brand} onChange={(e) => update({ brand: e.target.value })}>
              <option value="">All brands</option>
              {facets?.brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>

          <label className="filter-group">
            <h4>Price</h4>
            <select value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })}>
              {PRICE_CAPS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={filters.inStock === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} />
            In stock only
          </label>

          {isFiltered && (
            <button className="btn btn-ghost btn-sm" onClick={() => setParams({})}>
              Clear all filters
            </button>
          )}
        </aside>

        <section>
          <div className="toolbar">
            <p className="muted">
              {result ? `${result.total} product${result.total === 1 ? '' : 's'}` : ' '}
              {filters.q && (
                <>
                  {' '}for <strong className="text">“{filters.q}”</strong>
                </>
              )}
            </p>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <ErrorNote error={error} />
          {loading && !result ? (
            <Spinner label="Loading products…" />
          ) : result?.items.length === 0 ? (
            <div className="empty">
              <h3>No products match those filters</h3>
              <button className="btn btn-ghost" onClick={() => setParams({})}>Clear filters</button>
            </div>
          ) : (
            <div className={`grid ${loading ? 'is-loading' : ''}`}>
              {result?.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {result && result.pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn-ghost btn-sm" disabled={filters.page <= 1} onClick={() => update({ page: String(filters.page - 1) })}>
                ← Prev
              </button>
              <span className="muted">Page {filters.page} of {result.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={filters.page >= result.pages} onClick={() => update({ page: String(filters.page + 1) })}>
                Next →
              </button>
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
