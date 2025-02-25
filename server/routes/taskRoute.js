import express from "express";
import {
  createSubTask,
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  deleteTask,
  duplicateTask,
  getTask,
  getTasks,
  postTaskActivity,
  trashTask,
  updateTask,
  updateTaskStage,
  getAllTasks,
  departmentGraph,
  individualDepartmentGraph,
} from "../controllers/taskController.js";
import { evaluatePerformance } from "../controllers/performanceController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

router.post("/create", protectRoute, checkPermission("can create tasks"), createTask);
router.post("/duplicate/:id", protectRoute, checkPermission("can duplicate task"), duplicateTask);
router.post("/activity/:id", protectRoute, checkPermission("can add task activity"), postTaskActivity);
router.get("/all", protectRoute, getAllTasks);

router.get("/dashboard", protectRoute, checkPermission("can view dashboard"), dashboardStatistics);
router.get("/departmentGraph", protectRoute, checkPermission("can view dashboard"), departmentGraph);
router.get("/individualDepartmentGraph", protectRoute, checkPermission("can view dashboard"), individualDepartmentGraph);

router.get("/", protectRoute, checkPermission("can view tasks"), getTasks);
router.get("/:id", protectRoute, checkPermission("can view task details"), getTask);
router.post("/performance/evaluation", protectRoute, checkPermission("can evaluate performance"), evaluatePerformance);

router.put("/create-subtask/:id", protectRoute, checkPermission("can create subtask"), createSubTask);
router.put("/update/:id", protectRoute, checkPermission("can update task"), updateTask);
router.put("/change-stage/:id", protectRoute, checkPermission("can change task stage"), updateTaskStage);
router.put("/:id", protectRoute, checkPermission("can trash task"), trashTask);

router.delete("/delete-restore/:id?", protectRoute, checkPermission("can delete task"), deleteRestoreTask);

router.delete("/delete/:id?", protectRoute, checkPermission("can trash task"), deleteTask);

export default router;
