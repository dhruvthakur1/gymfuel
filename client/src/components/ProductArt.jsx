import { CATEGORY_COLORS, CATEGORY_LABELS } from '../format.js';

// Draws a supplement tub in the category's colour, so the store needs no image hosting.
export default function ProductArt({ product, className = '' }) {
  const color = CATEGORY_COLORS[product.category] || '#c6f432';
  const isBottle = product.category === 'vitamins';
  const id = `g-${product.slug}`;

  return (
    <svg className={`product-art ${className}`} viewBox="0 0 200 200" role="img" aria-label={product.name}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0" stopColor="#1b1d21" />
          <stop offset="0.45" stopColor="#2a2d33" />
          <stop offset="1" stopColor="#141518" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="110" r="95" fill={`url(#${id}-glow)`} />
      {isBottle ? (
        <g>
          <rect x="80" y="30" width="40" height="18" rx="4" fill={color} />
          <rect x="62" y="46" width="76" height="128" rx="18" fill={`url(#${id}-body)`} stroke="#3a3d44" />
          <rect x="62" y="84" width="76" height="56" fill={color} />
        </g>
      ) : (
        <g>
          <rect x="48" y="30" width="104" height="26" rx="6" fill={color} />
          <rect x="44" y="52" width="112" height="124" rx="12" fill={`url(#${id}-body)`} stroke="#3a3d44" />
          <rect x="44" y="88" width="112" height="56" fill={color} />
        </g>
      )}
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fontSize="13"
        fontWeight="900"
        fill="#0e0f11"
        fontFamily="Archivo, sans-serif"
        // Squeeze long brand names to fit the label instead of overflowing it.
        {...(product.brand.length > 11 ? { textLength: isBottle ? 64 : 96, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {product.brand.toUpperCase()}
      </text>
      <text x="100" y="130" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0e0f11" opacity="0.75" fontFamily="Archivo, sans-serif">
        {(CATEGORY_LABELS[product.category] || '').toUpperCase()}
      </text>
      {product.size && (
        <text x="100" y="164" textAnchor="middle" fontSize="10" fontWeight="600" fill="#9aa0a8" fontFamily="Archivo, sans-serif">
          {product.size}
        </text>
      )}
    </svg>
  );
}
