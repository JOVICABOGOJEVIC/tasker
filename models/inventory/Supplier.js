import mongoose from "mongoose";

const supplierSchema = mongoose.Schema({
  // Osnovne informacije
  name: { type: String, required: true },
  code: { type: String }, // Šifra dobavljača
  type: {
    type: String,
    enum: ['SUPPLIER', 'CUSTOMER', 'BOTH'],
    default: 'SUPPLIER'
  },
  
  // Kontakt informacije
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String },
  postalCode: { type: String },
  
  // Poreske informacije
  taxId: { type: String }, // PIB
  registrationNumber: { type: String }, // Matični broj
  
  // Finansijske informacije
  currency: { type: String, default: 'EUR' }, // Valuta
  paymentTerms: { type: String }, // Uslovi plaćanja (npr. "30 dana")
  creditLimit: { type: Number, default: 0 }, // Kreditni limit
  
  // Banka
  bankName: { type: String },
  bankAccount: { type: String },
  swiftCode: { type: String },
  
  // Povezanost
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  
  // Audit
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Supplier", supplierSchema);

