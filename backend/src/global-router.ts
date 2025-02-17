import { Router } from 'express';
import authRouter from './auth/auth-router';
import userRouter from './profile/user-router';

const globalRouter = Router();

globalRouter.use(authRouter);
globalRouter.use('/users', userRouter)

export default globalRouter;