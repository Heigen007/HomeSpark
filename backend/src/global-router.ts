import { Router } from 'express';
import authRouter from './auth/auth-router';
import userRouter from './profile/user-router';
import apartmentRouter from './apartment/apartment.router';

const globalRouter = Router();

globalRouter.use(authRouter);
globalRouter.use('/users', userRouter)
globalRouter.use('/apartments', apartmentRouter);


export default globalRouter;