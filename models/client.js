import mongoose from "mongoose";

const clientSchema = mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required']
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'] 
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  email: { 
    type: String
  },
  address: {
    street: {
      type: String,
      required: false
    },
    number: {
      type: String,
      required: false
    },
    floor: String,
    apartment: String,
    isHouse: {
      type: Boolean,
      default: false
    },
    countryCode: String
  },
  description: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("Client", clientSchema); 