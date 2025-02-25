import asyncHandler from "express-async-handler";
import Revenue from "../models/revenueModel.js";
import BranchRevenueModel from "../models/branchRevenueModel.js";
import RequestProgress from "../models/requestProgressModel.js";
import User from "../models/userModel.js";


const createRevenue = asyncHandler(async (req, res) => {
  const { revenueName, startDate, endDate, totalTarget, targetBranches } = req.body;

  if (typeof totalTarget !== 'number' || totalTarget <= 0) {
    return res.status(400).json({ status: false, message: "Invalid total target" });
  }

  if (!Array.isArray(targetBranches) || targetBranches.length === 0) {
    return res.status(400).json({ status: false, message: "Invalid target branches data" });
  }

  // Validate each target branch
  for (const branch of targetBranches) {
    if (!branch.id || typeof branch.target !== 'number' || branch.target < 0) {
      return res.status(400).json({ status: false, message: "Invalid branch data" });
    }
  }

  try {
    const revenue = await Revenue.create({
      revenueName,
      startDate,
      endDate,
      totalTarget,
      targetBranches: targetBranches.map(branch => ({
        id: branch.id,
        target: branch.target,
        achieved: 0
      })),
      date: new Date(),
    });

    if (revenue) {
      res.status(201).json({
        status: true,
        message: "Revenue created successfully",
        data: revenue
      });
    } else {
      res.status(400).json({ status: false, message: "Failed to create revenue" });
    }
  } catch (error) {
    console.error("Error creating revenue:", error.message); // Log the error message
    res.status(500).json({
      status: false,
      message: "An error occurred while creating revenue",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


const createBranchRevenue = asyncHandler(async (req, res) => {
  const { revenueAchieved } = req.body;

  if (typeof revenueAchieved !== 'number' || revenueAchieved < 0) {
    return res.status(400).json({ status: false, message: "Invalid revenue achieved value" });
  }

  const branchRevenue = await BranchRevenueModel.create({
    revenueAchieved,
    date: new Date(),
  });

  if (branchRevenue) {
    res.status(201).json({
      status: true,
      message: "Branch revenue created successfully",
      branchRevenue,
    });
  } else {
    res.status(400).json({ status: false, message: "Invalid branch revenue data" });
  }
});

const getAllBranchRevenue = asyncHandler(async (req, res) => {
  const branchRevenues = await BranchRevenueModel.find();

  res.status(200).json(branchRevenues);
});

// Get all revenue entries
const getRevenues = asyncHandler(async (req, res) => {
  try {
    const revenues = await Revenue.find(); // Fetch all revenue documents

    if (revenues.length === 0) {
      return res.status(404).json({ status: false, message: "No revenues found" });
    }

    console.log("Revenues Data:", revenues); // Log the revenues data

    res.status(200).json({
      status: true,
      message: "Revenues retrieved successfully",
      data: revenues,
    });
  } catch (error) {
    console.error("Error retrieving revenues:", error.message); // Log the error message
    res.status(500).json({
      status: false,
      message: "An error occurred while retrieving revenues",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});



// Get a single revenue entry by ID
const getRevenueById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: false, message: "No revenue ID provided" });
    }

    const revenue = await Revenue.findById(id);

    if (revenue) {
      res.status(200).json(revenue);
    } else {
      res.status(404).json({ status: false, message: "Revenue not found" });
    }
  } catch (error) {
    console.error("Error fetching revenue details:", error);
    res.status(500).json({
      status: false,
      message: "An unexpected error occurred while fetching revenue details",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


const updateRevenueBranch = asyncHandler(async (req, res) => {
  const { revenueId, branchId, target, achieved, status, requestId } = req.body; // Extract relevant fields from the body

  try {
    // Validate input
    if (typeof revenueId !== 'string' || typeof branchId !== 'string') {
      return res.status(400).json({ status: false, message: "Invalid revenueId or branchId" });
    }

    // Find the revenue by ID
    const revenue = await Revenue.findById(revenueId);
    if (!revenue) {
      return res.status(404).json({ status: false, message: "Revenue not found" });
    }

    // Find the specific branch in the revenue's targetBranches array
    const branchToUpdate = revenue.targetBranches.find(b => b.id === branchId);
    if (!branchToUpdate) {
      return res.status(404).json({ status: false, message: "Branch not found in the revenue" });
    }

    // Handle request based on status
    if (status === 'accepted') {
      // Update the branch's target if provided
      if (typeof target === 'number') {
        branchToUpdate.target = target;
      }

      // Update the branch's achieved and log history if provided
      if (typeof achieved === 'number') {
        branchToUpdate.achieved = achieved;
        branchToUpdate.achievedHistory.push({
          value: achieved,
          date: new Date(),
        });
      }

      // Save the updated revenue document
      const updatedRevenue = await revenue.save();

      // Delete the request after processing
      await RequestProgress.deleteOne({ _id: requestId });

      return res.status(200).json({
        status: true,
        message: "Branch updated successfully and request deleted",
        revenue: updatedRevenue,
      });
    } else if (status === 'rejected') {
      // Delete the request without making changes
      await RequestProgress.deleteOne({ _id: requestId });

      return res.status(200).json({
        status: true,
        message: "Request rejected and deleted without changes",
      });
    } else {
      return res.status(400).json({ status: false, message: "Invalid status" });
    }

  } catch (error) {
    console.error("Error updating branch:", error);
    res.status(500).json({
      status: false,
      message: "An error occurred while updating the branch",
      error: error.message,
    });
  }
});



const requestProgress = asyncHandler(async (req, res) => {
  const { revenueId, branchId, target, achieved, userId, status } = req.body;

  try {
 
    const revenue = await Revenue.findById(revenueId).select("revenueName targetBranches");
    if (!revenue) {
      return res.status(404).json({ status: false, message: "Revenue not found" });
    }

 
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User with ID ${userId} not found`);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const newRequestProgress = new RequestProgress({
      name: user.name,        
      userId,
      revenueId,
      branchId,
      achieved,
      targetName: revenue.revenueName 
    });

    await newRequestProgress.save();

    res.status(201).json({
      status: true,
      message: "RequestProgress record created successfully",
      data: newRequestProgress,
    });
  } catch (error) {
    console.error("Error creating request progress:", error.message);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      status: false,
      message: "An error occurred while creating the request progress",
      error: error.message,
    });
  }
});


const getAllRequestProgress = asyncHandler(async (req, res) => {
  try {
    // Retrieve all RequestProgress records
    const requestProgressList = await RequestProgress.find()

    // Print the retrieved data to the console
    console.log("Retrieved RequestProgress records:", requestProgressList);

    res.status(200).json({
      status: true,
      message: "RequestProgress records retrieved successfully",
      data: requestProgressList,
    });
  } catch (error) {
    console.error("Error fetching RequestProgress records:", error.message);
    res.status(500).json({
      status: false,
      message: "An error occurred while retrieving RequestProgress records",
      error: error.message,
    });
  }
});


// Delete a revenue entry
const deleteRevenue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Revenue.findByIdAndDelete(id);

  res.status(200).json({ status: true, message: "Revenue deleted successfully" });
});

export {
  createRevenue,
  getRevenues,
  getRevenueById,
  updateRevenueBranch,
  deleteRevenue,
  createBranchRevenue,
  getAllBranchRevenue,
  requestProgress,
  getAllRequestProgress,
};
