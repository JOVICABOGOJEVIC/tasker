import mongoose from "mongoose";

const customsDeclarationSchema = mongoose.Schema({
  // Osnovne informacije
  declarationNumber: { type: String, required: true, unique: true }, // Broj carinske deklaracije
  declarationDate: { type: Date, required: true },
  customsOffice: { type: String }, // Carinska služba
  customsOfficer: { type: String }, // Carinski službenik
  
  // Vrednost robe
  totalInvoiceValue: { type: Number, required: true }, // Ukupna fakturisana vrednost
  currency: { type: String, default: 'EUR' }, // Valuta
  exchangeRate: { type: Number, default: 1 }, // Kurs
  
  // Troškovi
  freightCost: { type: Number, default: 0 }, // Troškovi transporta
  insuranceCost: { type: Number, default: 0 }, // Osiguranje
  otherCosts: { type: Number, default: 0 }, // Ostali troškovi
  totalLandedCost: { type: Number, default: 0 }, // Ukupni troškovi do granice
  
  // Carina
  customsBasis: { type: Number, default: 0 }, // Osnovica za obračun carine
  customsDuty: { type: Number, default: 0 }, // Carina
  customsDutyRate: { type: Number, default: 0 }, // Carinska stopa (%)
  
  // PDV
  vatBasis: { type: Number, default: 0 }, // Osnovica za PDV (invoice + carina + troškovi)
  vatAmount: { type: Number, default: 0 }, // PDV na uvoz
  vatRate: { type: Number, default: 0 }, // PDV stopa (%)
  
  // Ukupno
  totalAmount: { type: Number, default: 0 }, // Ukupno za plaćanje (carina + PDV)
  
  // Dobavljač
  supplierName: { type: String },
  supplierAddress: { type: String },
  supplierCountry: { type: String },
  
  // Uvoznik
  importerName: { type: String },
  importerAddress: { type: String },
  importerPIB: { type: String },
  
  // Povezanost
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Dokumenti
  invoiceNumber: { type: String }, // Broj fakture dobavljača
  invoiceDate: { type: Date },
  packingListNumber: { type: String }, // Broj packing lista
  shippingDocumentNumber: { type: String }, // Broj otpremnice
  
  // Napomene
  notes: { type: String },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED'],
    default: 'DRAFT'
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("CustomsDeclaration", customsDeclarationSchema);

