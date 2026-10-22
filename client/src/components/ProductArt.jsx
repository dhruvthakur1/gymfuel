import { CATEGORY_LABELS, categoryColor } from '../format.js';

// Draws a supplement tub in the category's colour, so the store needs no image hosting.
export default function ProductArt({ product, className = '' }) {
  const { tone } = categoryColor(product.category);
  const isBottle = product.category === 'vitamins';
  const id = `g-${product.slug}`;
  const labelWidth = isBottle ? 60 : 92;

  return (
    <svg className={`product-art ${className}`} viewBox="0 0 200 200" role="img" aria-label={product.name}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0" stopColor="#f3f1ec" />
          <stop offset="0.35" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e2da" />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" x2="1">
          <stop offset="0" stopColor="#2a2a2a" />
          <stop offset="0.4" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#141414" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="178" rx={isBottle ? 42 : 60} ry="7" fill="#000" opacity="0.08" />

      {isBottle ? (
        <g>
          <rect x="80" y="30" width="40" height="20" rx="5" fill={`url(#${id}-lid)`} />
          <rect x="64" y="48" width="72" height="128" rx="20" fill={`url(#${id}-body)`} />
          <rect x="64" y="86" width="72" height="56" fill={tone} />
        </g>
      ) : (
        <g>
          <rect x="50" y="32" width="100" height="22" rx="6" fill={`url(#${id}-lid)`} />
          <rect x="46" y="52" width="108" height="124" rx="14" fill={`url(#${id}-body)`} />
          <rect x="46" y="88" width="108" height="56" fill={tone} />
        </g>
      )}

      <text
        x="100"
        y="112"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        letterSpacing="0.5"
        fill="#141414"
        fontFamily="Manrope, sans-serif"
        // Squeeze long brand names to fit the label instead of overflowing it.
        {...(product.brand.length > 11 ? { textLength: labelWidth, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {product.brand.toUpperCase()}
      </text>
      <text x="100" y="129" textAnchor="middle" fontSize="9" fontWeight="600" letterSpacing="1" fill="#141414" opacity="0.6" fontFamily="Manrope, sans-serif">
        {(CATEGORY_LABELS[product.category] || '').toUpperCase()}
      </text>
      {product.size && (
        <text x="100" y="162" textAnchor="middle" fontSize="9" fontWeight="600" fill="#8a857c" fontFamily="Manrope, sans-serif">
          {product.size}
        </text>
      )}
    </svg>
  );
}
