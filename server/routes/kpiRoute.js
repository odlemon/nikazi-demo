import express from "express";
import {
  createKPI,
  deleteKPI,
  getKPIById,
  getKPIs,
  updateKPI,
  getAllKPIs,
  duplicateKPI,
} from "../controllers/kpiController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

router.post("/create", protectRoute, checkPermission("can create KPIs"), createKPI);
router.post("/duplicate", protectRoute, duplicateKPI)
router.post("/get", protectRoute, checkPermission("can view KPIs"), getKPIs);
router.get("/all", protectRoute, checkPermission("can view all KPIs"), getAllKPIs);
router.get("/detail/:id", protectRoute, checkPermission("can view KPI details"), getKPIById);
router.put("/update/:id", protectRoute, checkPermission("can update KPIs"), updateKPI);
router.delete("/delete/:id", protectRoute, checkPermission("can delete KPIs"), deleteKPI);

export default router;
