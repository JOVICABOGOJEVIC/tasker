import mongoose from "mongoose";

const warehouseTransactionSchema = mongoose.Schema({
  // Tip transakcije
  transactionType: {
    type: String,
    enum: ['INPUT', 'OUTPUT', 'RETURN_IN', 'RETURN_OUT', 'TRANSFER', 'ADJUSTMENT'],
    required: true
  },
  
  // Dokument
  documentNumber: { type: String, required: true }, // Broj dokumenta (prijemnica, izdavnica)
  documentDate: { type: Date, required: true },
  documentType: {
    type: String,
    enum: ['RECEIPT', 'ISSUE', 'RETURN', 'TRANSFER', 'INVENTORY'],
    required: true
  },
  
  // Artikal
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  
  // Količine
  quantity: { type: Number, required: true }, // Količina
  unit: { type: String, required: true }, // Jedinica mere
  
  // Cene i vrednost
  unitPrice: { type: Number, required: true }, // Jedinična cena
  totalValue: { type: Number, required: true }, // Ukupna vrednost (quantity * unitPrice)
  
  // PDV i carina
  vatAmount: { type: Number, default: 0 }, // Iznos PDV-a
  vatRate: { type: Number, default: 0 }, // PDV stopa
  customsAmount: { type: Number, default: 0 }, // Carina
  customsRate: { type: Number, default: 0 }, // Carinska stopa
  landedCost: { type: Number, default: 0 }, // Ukupni troškovi nabavke (transport, špedicija, itd.)
  
  // Povezanost
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Uzroci i razlozi
  reason: { type: String }, // Razlog transakcije
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }, // Povezano sa poslom (ako je izlaz za servis)
  
  // Dobavljač/Kupac
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  partnerName: { type: String }, // Naziv partnera
  
  // Carinska deklaracija (za uvoz)
  customsDeclarationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomsDeclaration'
  },
  
  // Lokacija
  fromLocation: { type: String }, // Iz magacina (za transfer)
  toLocation: { type: String }, // U magacin (za transfer)
  
  // Napomene
  notes: { type: String },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("WarehouseTransaction", warehouseTransactionSchema);

