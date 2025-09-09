import mongoose from 'mongoose';

const companySchema = mongoose.Schema({
  // Basic user information
  ownerName: {type: String, required: true},
  email: {type: String, required: true},
  password: {type: String, required: false},
  googleId: {type: String, required: false},
  id: {type: String},
  
  // Company details
  companyName: {type: String, required: true},
  phone: {type: String, required: true},
  countryCode: {type: String, required: true, default: 'rs'},
  city: {type: String, required: true},
  address: {type: String, required: true},
  
  // Business type and configuration
  businessType: {
    type: String, 
    required: true, 
    enum: [
      "Home Appliance Technician", 
      "Electrician", 
      "Plumber", 
      "Auto Mechanic", 
      "Elevator Technician", 
      "HVAC Technician", 
      "Carpenter", 
      "Locksmith", 
      "Tile Installer", 
      "Painter", 
      "Facade Specialist", 
      "IT Technician", 
      "Handyman"
    ]
  },
  
  // Basic role assignment
  role: {type: String, required: true, default: "owner"},
  
  // Auto mechanic specific fields - all made optional
  garageAddress: {type: String, required: false},
  specializations: {type: [{type: String}], required: false},
  serviceableApplianceTypes: {type: [{type: String}], required: false},
  serviceRadius: {type: Number, required: false},
  defaultWarrantyDuration: {type: Number, required: false},
  hasInventory: {type: Boolean, default: false},
  offersMaintenanceContracts: {type: Boolean, default: false},
  
  // Fields for tracking business hours
  businessHours: {
    monday: {open: String, close: String},
    tuesday: {open: String, close: String},
    wednesday: {open: String, close: String},
    thursday: {open: String, close: String},
    friday: {open: String, close: String},
    saturday: {open: String, close: String},
    sunday: {open: String, close: String}
  },
  
  // Fields for tracking service capabilities
  services: [{
    name: {type: String},
    price: {type: Number},
    duration: {type: Number}, // in minutes
    description: {type: String}
  }],
  
  // Fields for tracking team members
  employees: [{
    name: {type: String},
    email: {type: String},
    phone: {type: String},
    role: {type: String},
    specialization: {type: String}
  }],
  
  // Account settings and preferences
  settings: {
    notifications: {type: Boolean, default: true},
    language: {type: String, default: "en"},
    currency: {type: String, default: "RSD"},
    dateFormat: {type: String, default: "DD/MM/YYYY"}
  },
  
  // Timestamps
  created: {type: Date, default: Date.now},
  lastUpdated: {type: Date, default: Date.now}
});

const CompanyModel = mongoose.model('Company', companySchema);

export default CompanyModel;
