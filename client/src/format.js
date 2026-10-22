const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// Prices come from the API in paise.
export const formatPrice = (paise) => inr.format(Math.round(paise / 100));

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const FREE_SHIPPING_THRESHOLD = 299900;
export const SHIPPING_FEE = 9900;

export const CATEGORY_LABELS = {
  protein: 'Protein',
  'pre-workout': 'Pre-Workout',
  creatine: 'Creatine',
  'amino-acids': 'Amino Acids',
  'mass-gainer': 'Mass Gainers',
  vitamins: 'Vitamins & Health',
};

// tint: soft background behind product art; tone: the label colour on the tub.
export const CATEGORY_COLORS = {
  protein: { tint: '#edf2e8', tone: '#b7cfa5' },
  'pre-workout': { tint: '#f9eee5', tone: '#eeb58e' },
  creatine: { tint: '#e7eff4', tone: '#a3c4d9' },
  'amino-acids': { tint: '#efecf6', tone: '#c4b8e4' },
  'mass-gainer': { tint: '#f6f1e2', tone: '#e2cb8c' },
  vitamins: { tint: '#f7ebee', tone: '#e5b3c0' },
};

export const categoryColor = (category) => CATEGORY_COLORS[category] || CATEGORY_COLORS.protein;
