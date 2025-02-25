import mongoose, { Schema } from "mongoose";
import Branch from "./branchModel.js";

const kpiSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['Metric', 'Percentage'],
    },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    weightValue: { type: Schema.Types.Decimal128, required: true },
  },
  { timestamps: true }
);

kpiSchema.index({ name: 1, branch: 1 }, { unique: true });

const KPI = mongoose.model("KPI", kpiSchema);

export default KPI;
