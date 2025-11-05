import mongoose from 'mongoose';

const subscriptionPaymentSchema = mongoose.Schema({
  // Osnovne informacije
  paymentNumber: { type: String, required: true, unique: true }, // Broj plaćanja
  paymentDate: { type: Date, required: true, default: Date.now },
  
  // Tip plaćanja
  paymentType: {
    type: String,
    enum: ['DONATION', 'SUBSCRIPTION'], // Donacija (beta) ili Pretplata
    required: true
  },
  
  // Period (za donacije/potreba za beta)
  period: {
    type: String,
    enum: ['BETA_MONTH_1', 'BETA_MONTH_2', 'BETA_MONTH_3', 'MONTHLY'], // Beta mesec ili mesečna preplata
    required: true
  },
  
  // Povezanost sa korisnikom (kompanijom)
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Pretplata informacije
  subscriptionPackage: {
    type: String,
    enum: ['free', 'standard', 'business', 'premium'],
    required: true
  },
  
  // Iznos
  amount: { type: Number, required: true }, // Iznos plaćanja
  currency: { type: String, default: 'RSD' },
  
  // Status plaćanja
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'VERIFIED', 'CANCELLED'],
    default: 'PENDING',
    required: true
  },
  
  // Virman informacije (za plaćanje na tvoj račun)
  wireTransfer: {
    // TVOJ ŽIRO RAČUN (kao primatelj)
    recipientBankName: { type: String }, // Tvoja banka
    recipientAccountNumber: { type: String }, // Tvoj broj računa
    recipientAccountHolder: { type: String }, // Tvoje ime/kompanija
    // Reference za korisnika
    referenceNumber: { type: String }, // Poziv na broj (automatski generisan)
    model: { type: String, default: '97' }, // Model odobrenja (97 za RSD)
    purpose: { type: String, default: 'Pretplata SpinTasker' }, // Svrha plaćanja
  },
  
  // Plaćanje informacije (kada korisnik plati)
  payment: {
    paidDate: { type: Date }, // Datum kada je korisnik platio
    paymentReference: { type: String }, // Referenca koju je korisnik uneo
    paymentNote: { type: String }, // Napomena od korisnika
    paidBy: { type: String }, // Ime korisnika koji je platio
    verifiedDate: { type: Date }, // Datum kada si ti verifikovao plaćanje
    verifiedBy: { type: String } // Tvoj username/ime
  },
  
  // Subscription aktivacija
  subscriptionStartDate: { type: Date }, // Kada počinje subscription
  subscriptionEndDate: { type: Date }, // Kada ističe subscription
  
  // Automatska aktivacija
  autoActivated: { type: Boolean, default: false }, // Da li je automatski aktivirano
  activatedAt: { type: Date }, // Kada je aktivirano
  
  // Napomene
  notes: { type: String }, // Napomena od korisnika
  internalNotes: { type: String }, // Interna napomena (samo ti vidiš)
  
  // Audit
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index za brže pretrage
subscriptionPaymentSchema.index({ companyId: 1, paymentDate: -1 });
subscriptionPaymentSchema.index({ status: 1 });
subscriptionPaymentSchema.index({ paymentType: 1 });

// Pre-save middleware
subscriptionPaymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Izračunaj datume subscription-a ako je verifikovano
  if (this.status === 'VERIFIED' && !this.autoActivated) {
    this.autoActivated = true;
    this.activatedAt = new Date();
    
    // Izračunaj datume subscription-a
    if (!this.subscriptionStartDate) {
      this.subscriptionStartDate = new Date();
    }
    
    if (!this.subscriptionEndDate) {
      const endDate = new Date(this.subscriptionStartDate);
      if (this.period === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // Beta mesec - 1 mesec
        endDate.setMonth(endDate.getMonth() + 1);
      }
      this.subscriptionEndDate = endDate;
    }
  }
  
  next();
});

const SubscriptionPayment = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);

export default SubscriptionPayment;

