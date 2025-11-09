import mongoose from 'mongoose';

const aiBusinessIdeaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Naslov je obavezan'],
      trim: true,
    },
    phase: {
      type: String,
      required: [true, 'Faza je obavezna'],
      trim: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    actionSteps: {
      type: [String],
      default: [],
    },
    aiAssist: {
      type: String,
      default: '',
      trim: true,
    },
    impact: {
      type: String,
      default: '',
      trim: true,
    },
    resources: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

aiBusinessIdeaSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const AIBusinessIdea = mongoose.model('AIBusinessIdea', aiBusinessIdeaSchema);

export default AIBusinessIdea;


