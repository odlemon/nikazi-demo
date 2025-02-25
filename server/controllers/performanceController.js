import asyncHandler from "express-async-handler";
import Task from "../models/taskModel.js";
import Kpi from "../models/kpiModel.js";

const evaluatePerformance = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;

    const allKpis = await Kpi.find({});
    console.log('\n=== All KPIs in System ===');
    allKpis.forEach(kpi => {
      console.log({
        KPI_ID: kpi._id,
        Name: kpi.name,
        Type: kpi.type,
        WeightValue: kpi.weightValue ? parseFloat(kpi.weightValue.$numberDecimal) : 0,
        Branch: kpi.branch,
        Created_At: kpi.createdAt,
        Updated_At: kpi.updatedAt
      });
    });
    console.log('========================\n');

    const tasks = await Task.find({
      team: userId,
      isTrashed: false,
    }).populate('team', 'name').populate('kpi', 'name type weightValue branch');

    if (tasks.length === 0) {
      return res.status(200).json({ status: false, message: "User has no tasks assigned." });
    }

    const statusCounts = {
      completed: 0,
      inProgress: 0,
      started: 0,
      todo: 0,
      overdue: 0
    };

    tasks.forEach(task => {
      if (statusCounts.hasOwnProperty(task.stage)) {
        statusCounts[task.stage]++;
      }
    });

    const userPerformance = tasks.length > 0 ? tasks[0].team[0] : null;
    if (!userPerformance) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    const totalTasks = tasks.length;
    let totalWeightedScore = 0;

    console.log('\n=== Task-KPI Relationships ===');
    for (const task of tasks) {
      const statusScore = getStatusScore(task.stage);
      const priorityMultiplier = getPriorityMultiplier(task.priority);

      const kpiWeight = task.kpi?.weightValue?.$numberDecimal ? parseFloat(task.kpi.weightValue.$numberDecimal) : 0;

      const objectiveValue = statusScore * priorityMultiplier;
      const finalPoints = objectiveValue * (1 + kpiWeight);

      // console.log(`\nTask Details:`);
      // console.log({
      //   Task_ID: task._id,
      //   Title: task.title,
      //   Stage: task.stage,
      //   Priority: task.priority,
      //   KPI_Details: task.kpi ? {
      //     KPI_ID: task.kpi._id,
      //     Name: task.kpi.name,
      //     Type: task.kpi.type,
      //     WeightValue: kpiWeight,
      //     Branch: task.kpi.branch
      //   } : 'No KPI assigned',
      //   Calculations: {
      //     Status_Score: statusScore,
      //     Priority_Multiplier: priorityMultiplier,
      //     KPI_Weight: kpiWeight,
      //     Objective_Value: objectiveValue,
      //     Final_Points: finalPoints
      //   }
      // });

      totalWeightedScore += finalPoints;
    }
    console.log('===========================\n');

    const overallRating = totalTasks > 0 ? totalWeightedScore / totalTasks : 0;

    const performanceRating = {
      user: userPerformance.name,
      overallRating: overallRating.toFixed(2),
      statusCounts,
      totalTasks,
      tasks: tasks.map(task => {
        let rating = 'N/A';
        let percentage = 'N/A'
        let monetaryValue = parseFloat(task.monetaryValue).toFixed(2);
        let monetaryValueAchieved = parseFloat(task.monetaryValueAchieved).toFixed(2);
        let percentValue = parseFloat(task.percentValue || 0).toFixed(2);
        let percentValueAchieved = parseFloat(task.percentValueAchieved || 0).toFixed(2);
    
        if (task.kpi) {
          if (task.kpi.type === "Metric" && monetaryValue && monetaryValueAchieved) {
            rating = ((monetaryValueAchieved / monetaryValue) * 100).toFixed(2);
          } else if (task.kpi.type === "Percentage") {
            rating = 'x';
          }
        }

        if (task.kpi) {
          if (task.kpi.type === "Percentage") {
            if (percentValue === 0 && percentValueAchieved === 0) {
              percentage = "0";
            } else if (percentValueAchieved !== 0) {
              percentage = (percentValue / percentValueAchieved).toFixed(2);
            } else {
              percentage = 0; // Handles cases where percentValueAchieved is zero but percentValue is not
            }
          }
        }
        
        

        return {
          _id: task._id,
          name: task.title,
          kpiName: task.kpi ? task.kpi.name : 'N/A',
          kpiType: task.kpi ? task.kpi.type : 'N/A',
          created_at: task.created_at,
          stage: task.stage,
          priority: task.priority,
          kpiWeight: task.kpi?.weightValue?.$numberDecimal ? parseFloat(task.kpi.weightValue.$numberDecimal).toFixed(2) : 0,
          rating,
          percentage,
        };
      }),
    };

    performanceRating.totalRating = performanceRating.tasks
  .filter(task => task.kpiType === 'Metric' && task.rating !== 'N/A')
  .reduce((sum, task) => sum + parseFloat(task.rating), 0)
  .toFixed(2);

  performanceRating.totalPercentage = performanceRating.tasks
  .filter(task => task.kpiType === 'Percentage' && task.percentage !== 'N/A')
  .reduce((sum, task) => sum + parseFloat(task.percentage), 0)
  .toFixed(2);

console.log('Total Rating for Metric tasks:', performanceRating.totalRating);
    

    console.log('\n=== Final Performance Summary ===');
    console.log(performanceRating);
    console.log('===============================\n');

    res.status(200).json({ status: true, performance: performanceRating });
  } catch (error) {
    console.error("Error in evaluatePerformance:", error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

function getStatusScore(status) {
  switch (status) {
    case 'completed':
      return 1;
    case 'inProgress':
      return 0.5;
    case 'started':
      return 0;
    case 'todo':
      return 0;
    case 'overdue':
      return -1;
    default:
      return 0;
  }
}

function getPriorityMultiplier(priority) {
  switch (priority) {
    case 'high':
      return 5;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 1;
  }
}

export { evaluatePerformance };