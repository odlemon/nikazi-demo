import express from "express";
import {
  createBranch,
  deleteBranch,
  getBranchById,
  getBranches,
  updateBranch,
} from "../controllers/branchController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { disableCaching } from "../middleware/disableCaching.js";

const router = express.Router();

router.post("/create", protectRoute, checkPermission("can create branches"), createBranch);
router.get("/get", protectRoute, disableCaching, getBranches);
router.get("/detail/:id", protectRoute, disableCaching, getBranchById);
router.put("/update/:id", protectRoute, updateBranch);
router.delete("/delete/:id", protectRoute, checkPermission("can delete branches"), deleteBranch);

export default router;
