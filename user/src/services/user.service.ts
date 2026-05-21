import prisma from '../config/db.js';
import { Role } from '../generated/prisma/client.js';

import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { generateTokens, verifyRefreshToken } from '../utils/generateToken.js';
import crypto from 'crypto';
import { sendEmail } from "../mails/sendEmail.js"
import { forgotPasswordTemplate, emailVerificationTemplate } from '../templates/emailTemplates.js';

// Interface for user payload
interface UserPayload {
  id: string;
  email: string;
  role?: string;
}

export const createUser = async (userData: any) => {
  const { name, email, password, role = Role.USER } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Hash verification token for DB storage
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      verificationToken: hashedToken,
      isVerified: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      verificationToken: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Send Email
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const verifyUrl = `${clientUrl}/verify-email/${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: "Verify Your Email",
      html: emailVerificationTemplate(verifyUrl, user.name || "User"),
    });
    console.log(`✅ Verification email sent to ${user.email}`);
  } catch (emailError) {
    console.error("Error sending verification email during registration:", emailError);
  }

  return user;
};

export const loginUserService = async (userData: any) => {
  const { email, password } = userData;

  // 1. Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  
  // Guard clause: check if user exists BEFORE generating tokens
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // 2. Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check email verification status
  // if (!user.isVerified) {
  //   throw new AppError('Please verify your email first', 401);
  // }

  // 3. Generate Access and Refresh tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

export const updateUserProfile = async (id: string, data: any) => {
    // If password is being updated, hash it first
    const updateData: any = {
        name: data.name,
        email: data.email,
    };

    if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
    }

    return await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true }
    });
};

export const deleteUserById = async (id: string) => {
    return await prisma.user.delete({ where: { id } });
};

export const listAllUsers = async () => {
    return await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
};

export const findUserById = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true }
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
};


export const refreshUserTokens = async (token: string) => {
    const decoded = verifyRefreshToken(token);
    if (!decoded) throw new AppError('Invalid or expired refresh token', 401);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) throw new AppError('User no longer exists', 404);

    return generateTokens(user.id, user.role);
};



export const processForgotPassword = async (
  email: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Security: Don't reveal if user exists
  if (!user) return;

  // Generate reset token
  const resetToken = crypto
    .randomBytes(32)
    .toString("hex");

  // Hash token before storing
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Save token in DB
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: new Date(
        Date.now() + 3600000 // 1 hour
      ),
    },
  });

  // Frontend reset URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // Send Email
  await sendEmail({
    to: user.email,
    subject: "Reset Your Password",
    html: forgotPasswordTemplate(resetUrl, user.name || "User"),
  });

  console.log(
    `✅ Password reset email sent to ${user.email}`
  );
};

export const processResetPassword = async (token: string, newPassword: string) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { gt: new Date() }
        }
    });

    if (!user) throw new AppError('Token is invalid or has expired', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        }
    });
};

export const processEmailVerification = async (token: string) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({ where: { verificationToken: hashedToken } });
    if (!user) throw new AppError('Invalid verification token', 400);

    await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verificationToken: null }
    });
};

export const processChangePassword = async (userId: string, oldPass: string, newPass: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch) throw new AppError('Old password does not match', 400);

    const hashedNewPassword = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
    });
};


export const processResendVerification = async (
  email: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isVerified) {
    throw new AppError(
      "Email already verified",
      400
    );
  }

  // Generate verification token
  const verificationToken = crypto
    .randomBytes(32)
    .toString("hex");

  // Hash verification token for DB storage
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  // Save token in DB
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: hashedToken,
    },
  });

  // Verification URL
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const verificationUrl = `${clientUrl}/verify-email/${verificationToken}`;

  // Send Email
  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: emailVerificationTemplate(verificationUrl, user.name || "User"),
  });

  console.log(
    `✅ Verification email sent to ${user.email}`
  );
};