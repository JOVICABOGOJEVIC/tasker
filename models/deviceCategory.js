import mongoose from 'mongoose';

const deviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Naziv kategorije je obavezan'],
      trim: true,
    },
    color: {
      type: String,
      default: '#3B82F6',
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    businessType: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

deviceCategorySchema.index(
  { userEmail: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

deviceCategorySchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const DeviceCategory = mongoose.model('DeviceCategory', deviceCategorySchema);

export default DeviceCategory;

