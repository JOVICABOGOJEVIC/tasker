import mongoose from 'mongoose';

const jobSchema = mongoose.Schema({
    // Client information
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientAddress: { type: String },
    
    // Device information
    deviceType: { type: String, required: true },
    deviceBrand: { type: String, required: true },
    deviceModel: { type: String, required: true },
    deviceSerialNumber: { type: String, required: true },
    hasWarranty: { type: Boolean, default: false },
    warrantyExpiration: { type: Date },
    
    // Service information
    issueDescription: { type: String, required: true },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High', 'Urgent'], 
        default: 'Medium' 
    },
    status: { 
        type: String, 
        enum: ['Received', 'Diagnosing', 'Waiting for Parts', 'In Repair', 'Completed', 'Delivered', 'Cancelled', 'In Pending'], 
        default: 'In Pending' 
    },
    serviceDate: { type: Date, required: false },
    scheduledTime: { type: String, required: false },
    estimatedDuration: { type: Number, required: false }, // Duration in hours (e.g., 0.5, 1, 1.5, etc.)
    assignedTo: { type: String, required: true },
    usedSpareParts: [{ type: String }],
    
    // Report information
    report: {
        materialsUsed: { type: String },
        workDescription: { type: String },
        serviceCharged: { type: String },
        customerSignature: { type: String },
        additionalNotes: { type: String },
        usedSpareParts: [{
            _id: { type: String },
            name: { type: String },
            code: { type: String },
            price: { type: Number },
            quantity: { type: Number }
        }],
        totalTravelTime: { type: Number }, // in seconds
        totalWorkTime: { type: Number }, // in seconds
        completedAt: { type: Date },
        submittedAt: { type: Date, default: Date.now }
    },
    
    // Metadata
    businessType: { type: String, required: true },
    creator: { type: String },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Job = mongoose.model('Job', jobSchema);

export default Job; 