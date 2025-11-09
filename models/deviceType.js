import mongoose from 'mongoose';

const deviceTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Naziv uređaja je obavezan'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeviceCategory',
      required: [true, 'Kategorija je obavezna'],
      index: true,
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

deviceTypeSchema.index(
  { userEmail: 1, category: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

deviceTypeSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (ret.category?._id) {
      ret.category.id = ret.category._id;
      delete ret.category._id;
      delete ret.category.__v;
    }
    return ret;
  },
});

const DeviceType = mongoose.model('DeviceType', deviceTypeSchema);

export default DeviceType;

