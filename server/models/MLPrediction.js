import mongoose from 'mongoose';

const { Schema } = mongoose;

const mlPredictionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId },
    modelType: {
      type: String,
      enum: ['prediction', 'recommendation', 'anomaly'],
    },
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    riskScore: { type: Number },
    recommendations: [{ type: String }],
    isAnomaly: { type: Boolean },
    confidence: { type: Number },
  },
  { timestamps: true }
);

const MLPrediction = mongoose.model('MLPrediction', mlPredictionSchema);
export default MLPrediction;
