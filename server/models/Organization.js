import mongoose from 'mongoose';

const { Schema } = mongoose;

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['company', 'cabinet'] },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    industry: { type: String },
    size: { type: String },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
