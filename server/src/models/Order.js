import mongoose from 'mongoose';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    // Price snapshot at checkout time, so later catalogue edits don't change past orders.
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    flavor: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    shippingAddress: {
      fullName: String,
      line1: String,
      city: String,
      state: String,
      postalCode: String,
      phone: String,
    },
    payment: {
      provider: { type: String, enum: ['stripe', 'mock'] },
      sessionId: String,
      paymentIntentId: String,
      paidAt: Date,
    },
  },
  { timestamps: true }
);

orderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Order = mongoose.model('Order', orderSchema);
