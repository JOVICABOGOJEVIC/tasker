import mongoose from 'mongoose';

const paymentSchema = mongoose.Schema({
  // Osnovne informacije
  paymentNumber: { type: String, required: true, unique: true }, // Broj računa/fakture
  paymentDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date }, // Rok plaćanja
  
  // Povezanost sa poslom
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  
  // Klijent informacije
  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientEmail: { type: String },
  clientAddress: { type: String },
  clientPIB: { type: String }, // PIB klijenta (ako je pravno lice)
  
  // Tip plaćanja
  paymentType: {
    type: String,
    enum: ['WIRE_TRANSFER', 'CARD', 'PAYPAL', 'CASH'],
    default: 'WIRE_TRANSFER',
    required: true
  },
  
  // Status plaćanja
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'],
    default: 'PENDING',
    required: true
  },
  
  // Iznosi
  totalAmount: { type: Number, required: true }, // Ukupan iznos računa
  paidAmount: { type: Number, default: 0 }, // Plaćeni iznos
  remainingAmount: { type: Number, default: 0 }, // Preostali iznos
  
  // PDV informacije
  subtotal: { type: Number, required: true }, // Iznos bez PDV-a
  vatRate: { type: Number, default: 20 }, // PDV stopa (%)
  vatAmount: { type: Number, default: 0 }, // Iznos PDV-a
  
  // Valuta
  currency: { type: String, default: 'RSD' },
  
  // Stavke računa
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    vatRate: { type: Number, default: 20 }
  }],
  
  // Virman informacije
  wireTransfer: {
    bankName: { type: String }, // Naziv banke
    accountNumber: { type: String }, // Broj računa
    accountHolder: { type: String }, // Vlasnik računa
    referenceNumber: { type: String }, // Poziv na broj
    model: { type: String, default: '97' }, // Model odobrenja (97 za RSD)
    purpose: { type: String }, // Svrha plaćanja
    swiftCode: { type: String }, // SWIFT kod (za inostrana plaćanja)
    iban: { type: String } // IBAN (za inostrana plaćanja)
  },
  
  // Plaćanje informacije
  payment: {
    paidDate: { type: Date }, // Datum kada je plaćeno
    paymentReference: { type: String }, // Referenca plaćanja
    paymentNote: { type: String }, // Napomena o plaćanju
    paidBy: { type: String } // Ko je platio
  },
  
  // Napomene
  notes: { type: String },
  internalNotes: { type: String }, // Interna napomena (ne vidljiva klijentu)
  
  // Povezanost
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  // Audit
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index za brže pretrage
paymentSchema.index({ companyId: 1, paymentDate: -1 });
paymentSchema.index({ jobId: 1 });
paymentSchema.index({ status: 1 });

// Pre-save middleware za automatsko izračunavanje
paymentSchema.pre('save', function(next) {
  // Izračunaj remaining amount
  if (this.totalAmount !== undefined && this.paidAmount !== undefined) {
    this.remainingAmount = this.totalAmount - this.paidAmount;
  }
  
  // Ažuriraj status na osnovu plaćanja
  if (this.remainingAmount <= 0 && this.paidAmount > 0) {
    this.status = 'PAID';
  } else if (this.paidAmount > 0 && this.paidAmount < this.totalAmount) {
    this.status = 'PARTIAL';
  } else if (this.dueDate && new Date() > this.dueDate && this.status === 'PENDING') {
    this.status = 'OVERDUE';
  }
  
  // Ažuriraj updatedAt
  this.updatedAt = new Date();
  
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

