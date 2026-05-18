import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  deleteProfile,
  getAllUsers,
  getUserById,
  deleteUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
} from "../controllers/user.controller.js";
import { protect, authorize, authorizeSelfOrAdmin } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
} from "../validators/user.validation.js";

const router = express.Router();

// Public routes
router.post("/register", authLimiter, validateRegistration, registerUser);
router.post("/login", authLimiter, validateLogin, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);

// Protected routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);
router.post("/change-password", protect, authLimiter, validatePasswordChange, changePassword);
router.post("/logout", protect, logoutUser);

// Admin or specific user management routes
router.get("/", protect, authorize("ADMIN"), getAllUsers);
router.get("/:id", protect, authorizeSelfOrAdmin("ADMIN", "MODERATOR"), getUserById);
router.delete("/:id", protect, authorizeSelfOrAdmin("ADMIN"), deleteUser);

export default router;

