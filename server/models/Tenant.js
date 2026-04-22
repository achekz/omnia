import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    type: {
      type: String,
      enum: ['company', 'cabinet'],
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Tenant', tenantSchema);