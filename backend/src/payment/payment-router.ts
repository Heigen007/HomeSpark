import { Router } from "express";
import PaymentService from "./payment-service";
import PaymentController from "./payment-controller";
import { authMiddleware } from "../middlewares/auth-middleware";

const paymentRouter = Router();
const paymentService = new PaymentService();
const paymentController = new PaymentController(paymentService);

paymentRouter.post('/pay', authMiddleware, paymentController.generatePaymentLink);
paymentRouter.post('/callback', paymentController.handlePaymentCallback);

export default paymentRouter;