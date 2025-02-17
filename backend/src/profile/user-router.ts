import UserController from "./user-controller";
import UserService from "./user-service";
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";

const userRouter = Router();
const userService = new UserService();
const userController = new UserController(userService);

userRouter.get('/:id', authMiddleware, userController.getUserInfo);
userRouter.put('/:id', authMiddleware, userController.updateUser);

export default userRouter;