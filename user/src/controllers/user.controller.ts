import type { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service.js";
import { AppError } from "../utils/AppError.js";

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await userService.loginUserService(req.body);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Assuming your auth middleware attaches user info to req.user
    const userId = (req as any).user.id;
    const profile = await userService.getUserProfile(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updatedUser = await userService.updateUserProfile(
      (req as any).user.id,
      req.body,
    );
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const deleteProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await userService.deleteUserById((req as any).user.id);
    res.status(200).json({ success: true, message: "Account deleted" });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await userService.listAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return next(new AppError("User ID parameter is required and must be a string", 400));
    }
    const user = await userService.findUserById(id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return next(new AppError("User ID parameter is required and must be a string", 400));
    }
    await userService.deleteUserById(id);
    res.status(200).json({ success: true, message: "User removed" });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== "string") {
      return next(new AppError("Refresh token is required", 400));
    }
    const tokens = await userService.refreshUserTokens(refreshToken);
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await userService.processForgotPassword(req.body.email);
    res
      .status(200)
      .json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== "string") {
      return next(new AppError("Invalid reset token format", 400));
    }
    const { newPassword } = req.body;
    if (!newPassword || Array.isArray(newPassword)) {
      return next(new AppError("Password is required", 400));
    }
    await userService.processResetPassword(token, newPassword);
    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== "string") {
      return next(new AppError("Invalid verification token format", 400));
    }
    await userService.processEmailVerification(token);
    res
      .status(200)
      .json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return next(new AppError("Email is required", 400));
    }
    await userService.processResendVerification(email);
    res
      .status(200)
      .json({ success: true, message: "Verification email resent." });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user.id;
    const { oldPassword, newPassword } = req.body;
    await userService.processChangePassword(userId, oldPassword, newPassword);
    res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};
