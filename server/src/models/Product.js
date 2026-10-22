import mongoose from 'mongoose';

export const CATEGORIES = ['protein', 'pre-workout', 'creatine', 'amino-acids', 'mass-gainer', 'vitamins'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    description: { type: String, default: '' },
    // Stored in the currency's smallest unit (paise for INR) to avoid floating point errors.
    price: { type: Number, required: true, min: 0 },
    size: { type: String, default: '' },
    flavors: [{ type: String }],
    tags: [{ type: String, lowercase: true }],
    stock: { type: Number, required: true, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

productSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Product = mongoose.model('Product', productSchema);
