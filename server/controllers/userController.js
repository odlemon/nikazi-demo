import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import createJWT from "../utils/index.js";
import Notice from "../models/notis.js";
import crypto from 'crypto';
import mongoose from "mongoose";
import Role from "../models/roleModel.js";
import Branch from "../models/branchModel.js";


function generateRandomPassword(length = 10) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({
      status: false,
      message: "Invalid email or password.",
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      status: false,
      message: "User account has been deactivated, contact the administrator",
    });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      status: false,
      message: "Invalid email or password.",
    });
  }

  const role = await Role.findById(user.role).select('permissions branch');

  if (!role) {
    return res.status(500).json({
      status: false,
      message: "User role not found, contact the administrator.",
    });
  }

  const token = createJWT(res, user._id);
  const responseUser = {
    ...user.toObject(),
    token,
    branch: role.branch,
    permissions: role.permissions, 
  };

  delete responseUser.password;

  res.status(200).json(responseUser);
});


const registerUser = asyncHandler(async (req, res) => {
  const { name, email, isAdmin, role, title, department, branchId } = req.body;

  try {

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res.status(400).json({ status: false, message: "Invalid role ID format" });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(400).json({ status: false, message: "Branch not found" });
    }

    const roleId = new mongoose.Types.ObjectId(role);

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res
        .status(400)
        .json({ status: false, message: "Email address already exists" });
    }

    const password = generateRandomPassword();

    const user = await User.create({
      name,
      email,
      password,
      isAdmin,
      role: roleId,
      department,
      title,
      branch: branchId,
    });

    if (user) {
      if (isAdmin) {
        createJWT(res, user._id);
      }

      user.password = password;

      res.status(201).json({
        ...user.toObject(),
        password,
        message: "User registered successfully. Login details are included in the response."
      });
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Error registering user:", error);
    return res
      .status(500)
      .json({ status: false, message: "Server error", error: error.message });
  }
});



const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

const getTeamList = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let query = {};

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
    query = { ...query, ...searchQuery };
  }

  const users = await User.find(query).select("name title role email isActive department branch comment feedbackComment developmentalAreas");

  res.status(201).json(users);
});

const getNotificationsList = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const notice = await Notice.find({
    team: userId,
    isRead: { $nin: [userId] },
  })
    .populate("task", "title")
    .sort({ _id: -1 });

  res.status(201).json(notice);
});

const markNotificationRead = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { isReadType, id } = req.query;

    if (isReadType === "all") {
      await Notice.updateMany(
        { team: userId, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
      );
    } else {
      await Notice.findOneAndUpdate(
        { _id: id, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
      );
    }
    res.status(201).json({ status: true, message: "Done" });
  } catch (error) {
    console.log(error);
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    
    const { _id } = req.body; // Get the ID directly from the request body

    const user = await User.findById(_id);

    if (user) {
      // Update user fields
      user.name = req.body.name || user.name;
      // user.email = req.body.email || user.email; // Uncomment if email should be updated
      user.title = req.body.title || user.title;
      user.role = req.body.role || user.role;
      user.department = req.body.department || user.department;
      user.profilePicture = req.body.profilePictureURL || user.profilePicture;
      user.branch = req.body.branch || user.branch;

      const updatedUser = await user.save();

      // Remove password from the response
      updatedUser.password = undefined;

      res.status(200).json({
        status: true,
        message: "Profile Updated Successfully.",
        user: updatedUser,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Error updating user profile:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(500).json({
      status: false,
      message: "An error occurred while updating the profile.",
      error: error.message,
    });
  }
});

const updateComment = asyncHandler(async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    
    const { _id, comment, developmentalAreas } = req.body; // Get the ID and comment directly from the request body

    const user = await User.findById(_id);

    if (user) {
      // Update the comment field
      user.comment = comment || user.comment;
      user.developmentalAreas = developmentalAreas || user.developmentalAreas;

      const updatedUser = await user.save();

      // Remove password from the response
      updatedUser.password = undefined;

      res.status(200).json({
        status: true,
        message: "Comment Updated Successfully.",
        user: updatedUser,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Error updating comment:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(500).json({
      status: false,
      message: "An error occurred while updating the comment.",
      error: error.message,
    });
  }
});


const updateFeedback = asyncHandler(async (req, res) => {
  try {
    const { _id, feedback } = req.body; // Get the ID and feedback comment from the request body

    // Log the incoming request body for debugging
    console.log("Request Body:", req.body);

    const user = await User.findById(_id);

    if (user) {
      // Update the feedback comment field
      user.feedbackComment = feedback || user.feedbackComment;

      const updatedUser = await user.save();

      // Remove password from the response
      updatedUser.password = undefined;

      const responseData = {
        status: true,
        message: "Comment Updated Successfully.",
        user: updatedUser,
      };

      // Log the response data before sending it
      console.log("Response Data:", responseData);

      res.status(200).json(responseData);
    } else {
      const errorResponse = { status: false, message: "User not found." };

      // Log the response data for a 404 case
      console.log("Response Data:", errorResponse);

      res.status(404).json(errorResponse);
    }
  } catch (error) {
    // Log the error details, including the request body for context
    console.error("Error updating comment:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    const errorResponse = {
      status: false,
      message: "An error occurred while updating the comment.",
      error: error.message,
    };

    // Log the error response data
    console.log("Error Response Data:", errorResponse);

    res.status(500).json(errorResponse);
  }
});



const deleteSnapshot = asyncHandler(async (req, res) => {
  try {
    
    const { _id } = req.body; // Get the ID and comment directly from the request body

    const user = await User.findById(_id);

    if (user) {
      // Update the comment field
      user.feedbackComment = "";
      user.comment = "";
      user.developmentalAreas = "";

      const updatedUser = await user.save();

      // Remove password from the response
      updatedUser.password = undefined;

      res.status(200).json({
        status: true,
        message: "Comment Updated Successfully.",
        user: updatedUser,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Error updating comment:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(500).json({
      status: false,
      message: "An error occurred while updating the comment.",
      error: error.message,
    });
  }
});

const getFeedback = asyncHandler(async (req, res) => {
  try {
    const { _id } = req.body; // Get the ID directly from the request body

    const user = await User.findById(_id);

    if (user) {
      // Return the feedbackComment without making any updates
      res.status(200).json({
        status: true,
        message: "User found.",
        feedbackComment: user.feedbackComment,
        developmentalAreas: user.developmentalAreas,
        comment: user.comment, // Return the feedbackComment
      });
    } else {
      res.status(404).json({ status: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Error retrieving comment:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(500).json({
      status: false,
      message: "An error occurred while retrieving the comment.",
      error: error.message,
    });
  }
});


const sendNotification = asyncHandler(async (req, res) => {
  try {
    const { _id } = req.body; // Get the ID directly from the request body

    const user = await User.findById(_id);

    if (user) {
      // Create an array with the user ID as the only member
      const team = [user._id];

      await Notice.create({
        team, // Use the team array that contains the user ID
        text: "Your performance report has been downloaded by your Manager",
      });

      res.status(200).json({
        status: true,
        message: "Notification has been sent to the employee.",
      });
    } else {
      res.status(404).json({ status: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Failed to send notification", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(500).json({
      status: false,
      message: "An error occurred while sending the notification.",
      error: error.message,
    });
  }
});



const activateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (user) {
    user.isActive = req.body.isActive;

    await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: `User account has been ${
        user?.isActive ? "activated" : "disabled"
      }`,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  if (userId === "65ff94c7bb2de638d0c73f63") {
    return res.status(404).json({
      status: false,
      message: "This is a test user. You can not change password. Thank you!!!",
    });
  }

  const user = await User.findById(userId);

  if (user) {
    user.password = req.body.password;

    await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: `Password changed successfully.`,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

const deleteUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);

  res.status(200).json({ status: true, message: "User deleted successfully" });
});

export {
  activateUserProfile,
  changeUserPassword,
  deleteUserProfile,
  getTeamList,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  getNotificationsList,
  markNotificationRead,
  updateComment,
  updateFeedback,
  deleteSnapshot,
  getFeedback,
  sendNotification,
};
