import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Naziv usluge je obavezan'],
      trim: true,
    },
    price: {
      type: Number,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    deviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeviceType',
      required: false,
      default: null,
    },
    deviceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeviceCategory',
      required: true,
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

serviceSchema.index(
  { userEmail: 1, deviceCategory: 1, name: 1 },
  { collation: { locale: 'en', strength: 2 } }
);

serviceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (ret.deviceType?._id) {
      ret.deviceType.id = ret.deviceType._id;
      delete ret.deviceType._id;
      delete ret.deviceType.__v;
    }
    if (ret.deviceCategory?._id) {
      ret.deviceCategory.id = ret.deviceCategory._id;
      delete ret.deviceCategory._id;
      delete ret.deviceCategory.__v;
    }
    if (ret.durationMinutes === undefined) {
      ret.durationMinutes = null;
    }
    return ret;
  },
});

const Service = mongoose.model('Service', serviceSchema);

export default Service;

