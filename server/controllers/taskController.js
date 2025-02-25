import asyncHandler from "express-async-handler";
import Notice from "../models/notis.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import KPI from "../models/kpiModel.js";
import Department from "../models/departmentModel.js"

const createTask = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      title, description, team, stage, date, priority, assets,
      monetaryValue, percentValue, kpi,
      monetaryValueAchieved, percentValueAchieved, branch, department
    } = req.body;
    console.log(req.body)
    let kpiData;
    if (kpi && kpi.id) {
      const kpiRecord = await KPI.findById(kpi.id);
      if (!kpiRecord) {
        return res.status(400).json({ status: false, message: "Invalid KPI selected." });
      }
      kpiData = {
        id: kpi.id,
        name: kpi.name || kpiRecord.name,
        type: kpi.type || kpiRecord.type
      };
    }

    let text = "New task has been assigned to you";
    if (team?.length > 1) {
      text = text + ` and ${team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set as ${priority} priority, so check and act accordingly. The task date is ${new Date(date).toDateString()}. Thank you!!!`;

    const activity = {
      type: "todo",
      activity: text,
      date: new Date(),
      by: userId,
    };

    const task = await Task.create({
      title,
      team,
      date,
      branch,
      department,
      description,
      priority: priority.toLowerCase(),
      stage: stage.toLowerCase(),
      assets,
      activities: [activity],
      monetaryValue,
      percentValue,
      monetaryValueAchieved: monetaryValueAchieved || 0,
      percentValueAchieved: percentValueAchieved || 0,
      kpi: kpiData ? kpiData : null,
    });

    await Notice.create({
      team,
      text,
      task: task._id,
    });

    res.status(200).json({ status: true, task, message: "Task created successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title, description, date, team, stage, priority, assets,
    monetaryValue, percentValue, kpi,
    monetaryValueAchieved, percentValueAchieved
  } = req.body;

  try {
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    let kpiData;
    if (kpi && kpi.id) {
      const kpiRecord = await KPI.findById(kpi.id);
      if (!kpiRecord) {
        return res.status(400).json({ status: false, message: "Invalid KPI selected." });
      }
      kpiData = {
        id: kpi.id,
        name: kpi.name || kpiRecord.name,
        type: kpi.type || kpiRecord.type
      };
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.date = date || task.date;
    task.priority = priority ? priority.toLowerCase() : task.priority;
    task.assets = assets || task.assets;
    task.stage = stage ? stage.toLowerCase() : task.stage;
    task.team = team || task.team;
    task.monetaryValue = monetaryValue || task.monetaryValue;
    task.percentValue = percentValue || task.percentValue;
    task.monetaryValueAchieved = monetaryValueAchieved || task.monetaryValueAchieved;
    task.percentValueAchieved = percentValueAchieved || task.percentValueAchieved;
    task.kpi = kpiData ? kpiData : task.kpi;

    await task.save();

    res.status(200).json({ status: true, message: "Task updated successfully.", task });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

const duplicateTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    let text = "New task has been assigned to you";
    if (task.team?.length > 1) {
      text = text + ` and ${task.team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set as ${task.priority
      } priority, so check and act accordingly. The task date is ${new Date(
        task.date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "todo",
      activity: text,
      by: userId,
    };

    const newTask = await Task.create({
      ...task.toObject(),
      title: "Duplicate - " + task.title,
      activities: [activity],
      monetaryValueAchieved: 0,
      percentValueAchieved: 0,
      kpi: task.kpi
    });

    await Notice.create({
      team: newTask.team,
      text,
      task: newTask._id,
    });

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});


const updateTaskStage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, monetaryValueAchieved, percentValueAchieved } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    task.stage = stage.toLowerCase();

    if (monetaryValueAchieved) {
      task.monetaryValueAchieved = (task.monetaryValueAchieved || 0) + monetaryValueAchieved;
    }

    if (percentValueAchieved) {
      task.percentValueAchieved = (task.percentValueAchieved || 0) + percentValueAchieved;
    }

    await task.save();

    res.status(200).json({
      status: true,
      message: "Task stage and achievements updated successfully.",
      task: {
        stage: task.stage,
        monetaryValueAchieved: task.monetaryValueAchieved,
        percentValueAchieved: task.percentValueAchieved
      }
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const createSubTask = asyncHandler(async (req, res) => {
  const { title, tag, date } = req.body;
  const { id } = req.params;

  try {
    const newSubTask = {
      title,
      date,
      tag,
    };

    const task = await Task.findById(id);

    task.subTasks.push(newSubTask);

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "SubTask added successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const getTasks = asyncHandler(async (req, res) => {
  const { userId, isAdmin } = req.user;
  const { stage, isTrashed, search } = req.query;

  let query = { isTrashed: isTrashed ? true : false };

  if (!isAdmin) {
    query.team = { $all: [userId] };
  }
  if (stage) {
    query.stage = stage;
  }

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { stage: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ],
    };
    query = { ...query, ...searchQuery };
  }

  let queryResult = Task.find(query)
    .populate({
      path: "team",
      select: "name title email",
    })
    .sort({ _id: -1 });

  const tasks = await queryResult;

  res.status(200).json({
    status: true,
    tasks,
  });
});
const getAllTasks = asyncHandler(async (req, res) => {
  try {
    const queryResult = Task.find({})
      .populate({
        path: "team",
        select: "name title email", // Only populate name, title, email from team
      })
      .sort({ _id: -1 });

    const tasks = await queryResult;
    const currentDate = new Date();
    const overdueTasks = [];

    for (let task of tasks) {
      // Check if the task is overdue
      if (task.date) {
        const taskDate = new Date(task.date);
        if (taskDate < currentDate) {
          // Task is overdue
          task.stage = "overdue";
          overdueTasks.push(task);
        } else if (task.stage === "overdue" && taskDate > currentDate) {
          // Task is marked as overdue but the date is in the future, change to in progress
          task.stage = "in progress";
          overdueTasks.push(task);
        }
      }

      // Check if KPI type is "Percentage" and update task stage accordingly
      if (task.kpi && task.kpi.type === "Percentage") {
        if (task.percentValueAchieved >= task.percentValue) {
          task.stage = "completed";
          overdueTasks.push(task);
        }
      }
    }

    // Bulk update overdue tasks (if needed)
    if (overdueTasks.length > 0) {
      await Task.bulkWrite(overdueTasks.map(task => ({
        updateOne: {
          filter: { _id: task._id },
          update: { stage: task.stage },
        },
      })));
    }

    // Directly include department from the task itself, no need to fetch it from team
    const tasksWithDepartment = tasks.map(task => {
      return {
        ...task._doc, // Spread task properties
        department: task.department || "Unknown", // Include department directly from task
      };
    });

    res.status(200).json({
      status: true,
      tasks: tasksWithDepartment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching tasks.",
    });
  }
});





const getTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate({
        path: "team",
        select: "name title role email",
      })
      .populate({
        path: "activities.by",
        select: "name",
      })
      .sort({ _id: -1 });

    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch task", error);
  }
});

const postTaskActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { type, activity, monetaryValueAchieved, percentValueAchieved } = req.body;

  try {
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    // Prepare the data object for the new activity
    const data = {
      type,
      activity,
      date: new Date(), // Ensure date is set to current date
      by: userId,
      collectedMonetary: 0, // Initialize the new field
      collectedPercent: 0,    // Initialize the new field
    };

    // Assign collected monetary or percentage based on KPI type
    if (task.kpi?.type === "Metric" && monetaryValueAchieved) {
      data.collectedMonetary = monetaryValueAchieved;
      task.monetaryValueAchieved = (task.monetaryValueAchieved || 0) + monetaryValueAchieved; // Update achieved monetary value
    } else if (task.kpi?.type === "Percentage" && percentValueAchieved) {
      data.collectedPercent = percentValueAchieved;
      task.percentValueAchieved = (task.percentValueAchieved || 0) + percentValueAchieved; // Update achieved percentage value
    }

    // Push the activity data to the task's activities array
    task.activities.push(data);

    // Update the task stage based on activity type
    if (type === "completed") {
      task.stage = "completed";
    } else if (type === "in progress") {
      task.stage = "in progress";
    } else if (type === "todo") {
      task.stage = "todo";
    }

    await task.save(); // Save the updated task document

    res.status(200).json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});


const trashTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const deleteRestoreTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;

    if (actionType === "delete") {
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      const resp = await Task.findById(id);

      resp.isTrashed = false;

      resp.save();
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});


const deleteTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    await Task.findByIdAndDelete(id);

    res.status(200).json({
      status: true,
      message: `Task deleted successfully.`,
    });
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: error.message,
    });
  }
});



const dashboardStatistics = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;

    const allTasks = isAdmin
      ? await Task.find({ isTrashed: false })
        .populate({
          path: "team",
          select: "name role title email department",
        })
        .populate({
          path: "kpi.id",
          select: "name type",
        })
        .sort({ _id: -1 })
      : await Task.find({
        isTrashed: false,
        team: { $all: [userId] },
      })
        .populate({
          path: "team",
          select: "name role title email department",
        })
        .populate({
          path: "kpi.id",
          select: "name type",
        })
        .sort({ _id: -1 });

    const tasksWithDepartments = allTasks.map((task) => {
      const departments = task.team.map((member) => member.department).filter(Boolean);
      const uniqueDepartments = [...new Set(departments)];
      return { ...task.toObject(), department: uniqueDepartments.join(", ") };
    });

    const users = await User.find({ isActive: true })
      .select("name title role isActive department createdAt")
      .limit(10)
      .sort({ _id: -1 });

    // Modified to group tasks by branch and stage
    const tasksByBranch = tasksWithDepartments.reduce((result, task) => {
      const branch = task.branch || 'Unspecified';
      const stage = task.stage;
      
      if (!result[branch]) {
        result[branch] = {
          total: 0,
          stages: {}
        };
      }
      
      result[branch].total += 1;
      result[branch].stages[stage] = (result[branch].stages[stage] || 0) + 1;
      
      return result;
    }, {});

    // Modified to calculate total tasks by branch
    const totalTasksByBranch = Object.entries(tasksByBranch).reduce((result, [branch, data]) => {
      result[branch] = data.total;
      return result;
    }, {});

    // Modified to calculate overdue tasks by branch
    const overdueTasksByBranch = tasksWithDepartments.reduce((result, task) => {
      const branch = task.branch || 'Unspecified';
      const statusLower = task.status?.toLowerCase();
      const isOverdue = (statusLower !== 'complete' && task.stage !== 'completed') && new Date(task.date) < new Date();
      
      if (isOverdue) {
        result[branch] = (result[branch] || 0) + 1;
      }
      
      return result;
    }, {});

    // Calculate totals
    const totalTasks = {
      byBranch: totalTasksByBranch,
      total: tasksWithDepartments.length
    };

    const totalOverdueTasks = {
      byBranch: overdueTasksByBranch,
      total: Object.values(overdueTasksByBranch).reduce((sum, count) => sum + count, 0)
    };

    const tasks = {
      byBranch: tasksByBranch,
      total: Object.entries(tasksByBranch).reduce((result, [branch, data]) => {
        Object.entries(data.stages).forEach(([stage, count]) => {
          result[stage] = (result[stage] || 0) + count;
        });
        return result;
      }, {})
    };

    const graphData = Object.entries(
      tasksWithDepartments.reduce((result, task) => {
        const { priority } = task;
        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    const last10Task = tasksWithDepartments.slice(0, 10);

    const departmentPerformance = tasksWithDepartments.reduce((result, task) => {
      task.team.forEach((member) => {
        const department = member.department;
        if (!department) return;

        const kpiId = task.kpi?.id?._id?.toString() || 'uncategorized';
        const kpiName = task.kpi?.id?.name || 'Uncategorized';

        if (!result[department]) {
          result[department] = {};
        }
        if (!result[department][kpiId]) {
          result[department][kpiId] = { 
            name: kpiName,
            completed: 0, 
            overdue: 0, 
            inProgress: 0 
          };
        }

        const statusLower = task.status?.toLowerCase();
        if (statusLower === 'complete' || task.stage === 'completed') {
          result[department][kpiId].completed += 1;
        } else if (statusLower === 'in progress' || task.stage === 'in progress') {
          result[department][kpiId].inProgress += 1;
        } else if (new Date(task.date) < new Date()) {
          result[department][kpiId].overdue += 1;
        }
      });
      return result;
    }, {});

    const kpiSummary = {};
    const branchSummary = {};

    tasksWithDepartments.forEach((task) => {
      const kpiId = task.kpi?.id?._id?.toString() || 'uncategorized';
      const kpiName = task.kpi?.id?.name || 'Uncategorized';
      const branch = task.branch || 'Unspecified';
      const monetaryValueAchieved = task.monetaryValueAchieved || 0;
      const percentValueAchieved = task.percentValueAchieved || 0;
      const type = task.kpi?.id?.type || 'Metric';

      if (!kpiSummary[kpiId]) {
        kpiSummary[kpiId] = {
          name: kpiName,
          totalMonetaryValue: 0,
          completedMonetaryValue: 0,
          revenueTarget: 0,
          revenueAchieved: 0,
          totalPercentageValue: 0,
          completedPercentageValue: 0,
          percentageRevenueTarget: 0,
          percentageRevenueAchieved: 0,
          branch: branch,
          type: type
        };
      }
      if (type === 'Metric') {
        kpiSummary[kpiId].totalMonetaryValue += task.monetaryValue || 0;
        kpiSummary[kpiId].completedMonetaryValue += monetaryValueAchieved;
      } else if (type === 'Percentage') {
        kpiSummary[kpiId].totalPercentageValue += task.percentValue || 0;
        kpiSummary[kpiId].completedPercentageValue += percentValueAchieved;
      }

      if (!branchSummary[branch]) {
        branchSummary[branch] = {
          totalMonetaryValue: 0,
          completedMonetaryValue: 0,
          revenueTarget: 0,
          revenueAchieved: 0,
          totalPercentageValue: 0,
          completedPercentageValue: 0,
          percentageRevenueTarget: 0,
          percentageRevenueAchieved: 0,
        };
      }
      if (type === 'Metric') {
        branchSummary[branch].totalMonetaryValue += task.monetaryValue || 0;
        branchSummary[branch].completedMonetaryValue += monetaryValueAchieved;
      } else if (type === 'Percentage') {
        branchSummary[branch].totalPercentageValue += task.percentValue || 0;
        branchSummary[branch].completedPercentageValue += percentValueAchieved;
      }
    });

    const calculateRevenue = (summary) => {
      Object.keys(summary).forEach(key => {
        const data = summary[key];
        if (data.type === 'Metric') {
          data.revenueTarget = data.totalMonetaryValue - data.completedMonetaryValue;
          data.revenueAchieved = data.completedMonetaryValue;
        } else if (data.type === 'Percentage') {
          data.percentageRevenueTarget = data.totalPercentageValue - data.completedPercentageValue;
          data.percentageRevenueAchieved = data.completedPercentageValue;
        }
      });
    };

    calculateRevenue(kpiSummary);
    calculateRevenue(branchSummary);

    const overallMonetaryTotals = Object.values(kpiSummary).reduce((totals, kpi) => {
      if (kpi.type === 'Metric') {
        totals.totalMonetaryValue += kpi.totalMonetaryValue;
        totals.completedMonetaryValue += kpi.completedMonetaryValue;
      }
      return totals;
    }, { totalMonetaryValue: 0, completedMonetaryValue: 0 });

    overallMonetaryTotals.revenueTarget = overallMonetaryTotals.totalMonetaryValue - overallMonetaryTotals.completedMonetaryValue;
    overallMonetaryTotals.revenueAchieved = overallMonetaryTotals.completedMonetaryValue;

    const overallPercentageTotals = Object.values(kpiSummary).reduce((totals, kpi) => {
      if (kpi.type === 'Percentage') {
        totals.totalPercentageValue += kpi.totalPercentageValue;
        totals.completedPercentageValue += kpi.completedPercentageValue;
      }
      return totals;
    }, { totalPercentageValue: 0, completedPercentageValue: 0 });

    overallPercentageTotals.percentageRevenueTarget = overallPercentageTotals.totalPercentageValue - overallPercentageTotals.completedPercentageValue;
    overallPercentageTotals.percentageRevenueAchieved = overallPercentageTotals.completedPercentageValue;

    const summary = {
      totalTasks,
      totalOverdueTasks,
      last10Task,
      users: isAdmin ? users : [],
      tasks,
      graphData,
      departmentPerformance,
      kpiSummary,
      branchSummary,
      overallMonetaryTotals,
      overallPercentageTotals
    };

    res.status(200).json({ status: true, ...summary, message: "Successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

const departmentGraph = asyncHandler(async (req, res) => {
  // Find tasks and populate the team and kpi fields
  let queryResult = Task.find({ "kpi.id": { $ne: null } })
    .populate({
      path: "team",
      select: "name title email department",
    })
    .populate({
      path: "kpi.id",
      select: "name type", 
    })
    .sort({ _id: -1 });

  const tasks = await queryResult;

  // Group tasks by KPI ID (not name) and department
  const kpiMap = new Map();

  for (const task of tasks) {
    if (task.kpi?.id?._id && task.team?.length > 0) {
      const kpiId = task.kpi.id._id.toString(); // Convert ObjectId to string for consistent comparison
      const department = task.department;

      if (!department) continue; // Skip if department is not available

      // Initialize KPI entry if not already present
      if (!kpiMap.has(kpiId)) {
        kpiMap.set(kpiId, {
          id: kpiId,
          name: task.kpi.id.name, // Store name but don't use it for grouping
          type: task.kpi.id.type,
          departments: new Map(),
        });
      }

      const kpiEntry = kpiMap.get(kpiId);

      // Initialize department entry if not already present
      if (!kpiEntry.departments.has(department)) {
        kpiEntry.departments.set(department, {
          monetaryValue: 0,
          monetaryValueAchieved: 0,
          percentValue: 0,
          percentValueAchieved: 0,
          taskCount: 0, // Added task count for better tracking
        });
      }

      const departmentMetrics = kpiEntry.departments.get(department);
      departmentMetrics.taskCount++; // Increment task count

      // Aggregate metrics based on KPI type
      if (kpiEntry.type === "Metric") {
        departmentMetrics.monetaryValue += Number(task.monetaryValue) || 0;
        departmentMetrics.monetaryValueAchieved += Number(task.monetaryValueAchieved) || 0;
      } else if (kpiEntry.type === "Percentage") {
        departmentMetrics.percentValue += Number(task.percentValue) || 0;
        departmentMetrics.percentValueAchieved += Number(task.percentValueAchieved) || 0;
      }
    }
  }

  // Convert maps to arrays and calculate averages for percentage KPIs
  const uniqueKPIs = Array.from(kpiMap.values()).map(kpi => ({
    id: kpi.id,
    name: kpi.name,
    type: kpi.type,
    departments: Array.from(kpi.departments).map(([department, metrics]) => {
      // If it's a percentage KPI, calculate the average
      if (kpi.type === "Percentage" && metrics.taskCount > 0) {
        metrics.percentValue = metrics.percentValue / metrics.taskCount;
        metrics.percentValueAchieved = metrics.percentValueAchieved / metrics.taskCount;
      }
      
      // Remove taskCount from final output if not needed
      const { taskCount, ...finalMetrics } = metrics;
      
      return {
        department,
        metrics: finalMetrics,
      };
    }),
  }));

  res.status(200).json({
    status: true,
    assignedKPIs: uniqueKPIs,
  });
});




const individualDepartmentGraph = asyncHandler(async (req, res) => {
  // Retrieve all departments from the database, including branch information
  const departments = await Department.find({}).select("name branch");

  // Find tasks and populate the team and KPI fields
  let queryResult = Task.find({ "kpi.id": { $ne: null } })  // Only tasks with an assigned KPI
    .populate({
      path: "team",
      select: "name title email department",
    })
    .populate({
      path: "kpi.id",
      select: "name type",
    })
    .sort({ _id: -1 });

  const tasks = await queryResult;

  // Group tasks by department and KPI
  const departmentMap = new Map();

  for (const task of tasks) {
    if (task.kpi && task.kpi.id) {
      const kpiId = task.kpi.id._id.toString();
      const kpiName = task.kpi.id.name;
      const kpiType = task.kpi.id.type;
      const department = task.department; // Get department directly from the task

      // Initialize department entry if not already present
      if (!departmentMap.has(department)) {
        departmentMap.set(department, new Map());
      }

      const departmentKPIs = departmentMap.get(department);

      // Initialize KPI entry if not already present
      if (!departmentKPIs.has(kpiId)) {
        departmentKPIs.set(kpiId, {
          id: kpiId,
          name: kpiName,
          type: kpiType,
          monetaryValue: 0,
          monetaryValueAchieved: 0,
          percentValue: 0,
          percentValueAchieved: 0,
        });
      }

      const kpiEntry = departmentKPIs.get(kpiId);

      // Aggregate metrics based on KPI type
      if (kpiType === "Metric") {
        kpiEntry.monetaryValue += task.monetaryValue || 0;
        kpiEntry.monetaryValueAchieved += task.monetaryValueAchieved || 0;
      } else if (kpiType === "Percentage") {
        kpiEntry.percentValue += task.percentValue || 0;
        kpiEntry.percentValueAchieved += task.percentValueAchieved || 0;
      }
    }
  }

  // Ensure all departments are included in the final result, even if they have no data
  const departmentsData = departments.map((department) => {
    const kpis = departmentMap.has(department.name)
      ? Array.from(departmentMap.get(department.name).values())
      : [];

    return {
      department: department.name,
      branch: department.branch, // Add the branch field to each department
      kpis,
    };
  });

  res.status(200).json({
    status: true,
    departments: departmentsData,
  });
});


export {
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
};
