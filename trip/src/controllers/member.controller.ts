import { Response } from "express";
import { AuthRequest } from "../middlewares/protect.js";
import * as memberService from "../services/member.service.js";

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { memberName } = req.body;
    const tripId = req.params.id as string;
    
    // Grab the logged-in user's ID injected by your auth middleware
    const userId = req.user?.id as string; 

    // Validation: We check both, but remember userId comes from auth, not the form body!
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing user authentication token",
      });
    }

    if (!memberName || memberName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Member Name is required",
      });
    }

    // Pass all three values over to your database service layer
    const member = await memberService.addMember(tripId, memberName.trim(), userId);

    return res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    // Prisma unique constraint error (e.g. this user is already added to this specific trip)
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: "This user is already a member of this trip",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add member",
    });
  }
};
export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.id as string;
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
    const tripId = req.params.id as string;

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
