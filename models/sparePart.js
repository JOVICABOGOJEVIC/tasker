import mongoose from "mongoose";

const sparePartSchema = mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  tax: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 0 },
  minQuantity: { type: Number, required: true, default: 1 },
  category: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userEmail: { type: String, required: true }
}, {
  collection: 'spareparts'
});

export default mongoose.model("SparePart", sparePartSchema); 