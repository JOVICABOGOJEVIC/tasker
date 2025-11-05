import mongoose from "mongoose";

// Povučena roba iz magacina (povezano sa poslovima)
const inventoryMovementSchema = mongoose.Schema({
  // Povezanost sa poslom
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  
  // Artikal
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  
  // Količina
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  
  // Tip povlačenja
  movementType: {
    type: String,
    enum: ['RESERVED', 'ISSUED', 'RETURNED', 'USED'],
    required: true
  },
  
  // Datumi
  reservedDate: { type: Date }, // Datum rezervacije
  issuedDate: { type: Date }, // Datum izdavanja (fizičko preuzimanje)
  returnedDate: { type: Date }, // Datum povratka (ako je neiskorišćeno)
  
  // Cene
  unitCost: { type: Number, required: true }, // Jedinična nabavna cena u momentu izdavanja
  totalCost: { type: Number, required: true }, // Ukupni trošak (quantity * unitCost)
  
  // Prodajna cena (za kalkulaciju marže)
  unitSellingPrice: { type: Number, default: 0 }, // Prodajna cena po jedinici
  totalSellingPrice: { type: Number, default: 0 }, // Ukupna prodajna vrednost
  
  // Marža
  margin: { type: Number, default: 0 }, // Marža u dinarskoj vrednosti
  marginPercentage: { type: Number, default: 0 }, // Marža u procentima
  
  // Status
  status: {
    type: String,
    enum: ['RESERVED', 'ISSUED', 'RETURNED', 'USED', 'CANCELLED'],
    default: 'RESERVED'
  },
  
  // Povezanost
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Radnik
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  
  // Napomene
  notes: { type: String },
  
  // Audit
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("InventoryMovement", inventoryMovementSchema);

