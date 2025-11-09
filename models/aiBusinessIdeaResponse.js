import mongoose from 'mongoose';

const aiBusinessIdeaResponseSchema = new mongoose.Schema(
  {
    idea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIBusinessIdea',
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['accepted', 'declined'],
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    companyEmail: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

aiBusinessIdeaResponseSchema.index({ idea: 1, company: 1 }, { unique: true });

aiBusinessIdeaResponseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const AIBusinessIdeaResponse = mongoose.model('AIBusinessIdeaResponse', aiBusinessIdeaResponseSchema);

export default AIBusinessIdeaResponse;


