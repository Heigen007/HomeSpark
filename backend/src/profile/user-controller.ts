import { Request, Response } from "express";
import { User } from "@prisma/client";
import UserService from "./user-service";

class UserController {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    getUserInfo = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = parseInt(req.params.id);
            const user = await this.userService.getUserInfo(userId);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            res.status(200).json(user);
        } catch {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    updateUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = parseInt(req.params.id);
            const user: User = req.body;
            const updatedUser = await this.userService.updateUser(userId, user);
            if (!updatedUser) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            res.status(200).json(updatedUser);
        } catch {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default UserController;