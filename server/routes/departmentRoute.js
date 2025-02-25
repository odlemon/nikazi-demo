import express from "express";
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartments,
  updateDepartment,
  getAllDepartments,
} from "../controllers/departmentController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();



router.post("/create", protectRoute, checkPermission("can create departments"), createDepartment);
router.post("/get", protectRoute, checkPermission("can view departments"), getDepartments);
router.get("/all", protectRoute, getAllDepartments);
router.get("/detail/:id", protectRoute, checkPermission("can view department details"), getDepartmentById);
router.put("/update/:id", protectRoute, checkPermission("can update departments"), updateDepartment);
router.delete("/delete/:id", protectRoute, checkPermission("can delete departments"), deleteDepartment);

export default router;
