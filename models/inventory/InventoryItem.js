import mongoose from "mongoose";

const inventoryItemSchema = mongoose.Schema({
  // Osnovne informacije
  itemCode: { type: String, required: true, unique: true }, // Šifra artikla
  name: { type: String, required: true }, // Naziv artikla
  description: { type: String },
  category: { type: String }, // Kategorija robe
  unit: { type: String, required: true, default: 'kom' }, // Jedinica mere (kom, kg, m, l, itd.)
  barcode: { type: String }, // Bar-kod
  serialNumber: { type: String }, // Serijski broj (opciono)
  lotNumber: { type: String }, // Lot broj (opciono)
  expiryDate: { type: Date }, // Rok trajanja (opciono)
  
  // Lokacija u magacinu
  warehouseLocation: { type: String }, // Magacin/Mesto
  storageSector: { type: String }, // Sektor/Regal
  storageBin: { type: String }, // Polica/Bin
  
  // Cene
  purchasePrice: { type: Number, required: true, default: 0 }, // Nabavna cena
  sellingPrice: { type: Number, default: 0 }, // Prodajna cena
  averageCost: { type: Number, default: 0 }, // Prosečna nabavna cena (za ponderisani prosek)
  
  // Poreske i carinske informacije
  vatRate: { type: Number, default: 0 }, // PDV stopa (%)
  customsRate: { type: Number, default: 0 }, // Carinska stopa (%)
  isImported: { type: Boolean, default: false }, // Da li je uvezena roba
  
  // Zaliha
  currentQuantity: { type: Number, required: true, default: 0 }, // Trenutna količina
  reservedQuantity: { type: Number, default: 0 }, // Rezervisana količina (za poslove)
  availableQuantity: { type: Number, default: 0 }, // Dostupna količina (current - reserved)
  minQuantity: { type: Number, default: 0 }, // Minimalna zaliha (alarm)
  maxQuantity: { type: Number, default: 0 }, // Maksimalna zaliha
  
  // Valorizacija
  totalValue: { type: Number, default: 0 }, // Ukupna vrednost zaliha (currentQuantity * averageCost)
  
  // Metoda vrednovanja
  valuationMethod: { 
    type: String, 
    enum: ['FIFO', 'LIFO', 'AVERAGE'], 
    default: 'AVERAGE' 
  },
  
  // Povezanost
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  supplierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier' 
  }, // Dobavljač
  
  // Status
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  
  // Audit
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Automatski ažuriranje availableQuantity
inventoryItemSchema.pre('save', function(next) {
  this.availableQuantity = Math.max(0, this.currentQuantity - this.reservedQuantity);
  this.totalValue = this.currentQuantity * this.averageCost;
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("InventoryItem", inventoryItemSchema);

