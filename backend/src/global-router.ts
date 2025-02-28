import { Router } from 'express';
import apartmentRouter from './apartment/apartment.router';
import authRouter from './auth/auth-router';
import userRouter from './profile/user-router';
import mapsRouter from './yandexMaps/maps-router';
import whatsappRouter from './whatsapp/whatsapp-router';


const globalRouter = Router();

globalRouter.use(authRouter);
globalRouter.use('/users', userRouter)
globalRouter.use('/apartments', apartmentRouter);
globalRouter.use('/maps', mapsRouter)
globalRouter.use('/whats', whatsappRouter)

export default globalRouter;