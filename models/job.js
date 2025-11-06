import mongoose from 'mongoose';

const jobSchema = mongoose.Schema({
    // Client information
    clientName: { type: String, required: false, default: 'Unknown Client' },
    clientPhone: { type: String, required: false, default: 'No phone' },
    clientEmail: { type: String, required: false, default: 'no-email@example.com' },
    clientAddress: { type: String },
    
    // Device information
    deviceType: { type: String, required: false, default: 'Unknown Device' },
    deviceBrand: { type: String, required: false, default: 'Unknown Brand' },
    deviceModel: { type: String, required: false, default: 'Unknown Model' },
    deviceSerialNumber: { type: String, required: false, default: 'N/A' },
    hasWarranty: { type: Boolean, default: false },
    warrantyExpiration: { type: Date },
    
    // Service information
    issueDescription: { type: String, required: false, default: 'No description provided' },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High', 'Urgent'], 
        default: 'Medium' 
    },
    status: { 
        type: String, 
        enum: ['Received', 'Diagnosing', 'Waiting for Parts', 'In Repair', 'Completed', 'Delivered', 'Cancelled', 'In Pending', 'On Road'], 
        default: 'In Pending' 
    },
    serviceDate: { type: Date, required: false },
    scheduledTime: { type: String, required: false },
    estimatedDuration: { type: Number, required: false }, // Duration in hours (e.g., 0.5, 1, 1.5, etc.)
    assignedTo: { type: String, required: false, default: 'Unassigned' },
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
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false // Temporarily false for existing jobs, will be set automatically
    },
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