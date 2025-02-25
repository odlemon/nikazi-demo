import mongoose, { Schema } from "mongoose";

const requestProgressSchema = new Schema(
  {
    name: { type: String, required: true },
    targetName: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revenueId: { type: Schema.Types.ObjectId, ref: "Revenue", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    achieved: { type: Number, required: true }
  },
  { timestamps: true }
);

const RequestProgress = mongoose.model("RequestProgress", requestProgressSchema);

export default RequestProgress;
