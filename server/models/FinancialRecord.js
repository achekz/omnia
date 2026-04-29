import mongoose from 'mongoose';

const { Schema } = mongoose;

const financialRecordSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    clientName: { type: String },
    type: { type: String, enum: ['income', 'expense'] },
    amount: { type: Number, required: true },
    category: { type: String },
    budgetLimit: { type: Number },
    description: { type: String },
    date: { type: Date, default: Date.now },
    isAnomaly: { type: Boolean, default: false },
    anomalyScore: { type: Number },
    flaggedAt: { type: Date },
  },
  { timestamps: true }
);

const FinancialRecord = mongoose.model('FinancialRecord', financialRecordSchema);
export default FinancialRecord;
