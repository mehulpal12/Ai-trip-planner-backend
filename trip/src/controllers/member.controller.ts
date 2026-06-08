import { Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../middlewares/protect.js";
import * as memberService from "../services/member.service.js";

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { memberName } = req.body;
    const tripId = req.params.tripId as string;
    
    // 1. Safe extraction of token context injected by auth middleware
    const userId = req.user?.id; 

    // 2. CRITICAL validation: Prevent downstream execution if missing credentials
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing or invalid user authentication token",
      });
    }

    // 3. Body validation
    if (!memberName || memberName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Member Name is required",
      });
    }

    // Generate a unique userId for the placeholder member
    const newMemberId = crypto.randomUUID();

    // 4. Safely forward isolated primitives to your service layer
    const member = await memberService.addMember(tripId, memberName.trim(), newMemberId);

    return res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    // Check for Prisma unique constraint violation (P2002)
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: "This user is already a member of this trip",
      });
    }

    // Fallback error handler
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add member",
    });
  }
};
export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const members = await memberService.getMembers(tripId);

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get members",
    });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tripId = req.params.tripId as string;

    await memberService.removeMember(tripId, userId as string);

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove member",
    });
  }
};
