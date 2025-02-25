import express from "express";
import {
  createRevenue,
  createBranchRevenue,
  getAllBranchRevenue,
  deleteRevenue,
  updateRevenueBranch,
      getRevenues,
      requestProgress,
      getAllRequestProgress,
} from "../controllers/revenueController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { disableCaching } from "../middleware/disableCaching.js";

const router = express.Router();

router.post("/create", protectRoute, disableCaching, createRevenue);
// router.post("/get", protectRoute, checkPermission("can view revenues"), getRevenues);


router.get("/all", protectRoute, disableCaching,  getRevenues);
router.get("/requests", protectRoute, disableCaching,  getAllRequestProgress);
router.put("/update/:id", protectRoute, disableCaching, updateRevenueBranch);
router.post("/request-progress", protectRoute, disableCaching, requestProgress);
router.delete("/delete/:id", protectRoute, disableCaching, deleteRevenue);
router.post("/branch-revenue", protectRoute, disableCaching, createBranchRevenue);

export default router;
