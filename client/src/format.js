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

export const CATEGORY_COLORS = {
  protein: '#c6f432',
  'pre-workout': '#ff7a1a',
  creatine: '#38d6f5',
  'amino-acids': '#a78bfa',
  'mass-gainer': '#fbbf24',
  vitamins: '#f472b6',
};
