import { Request, Response } from "express";
import PaymentService from "./payment-service";

class PaymentController {
    constructor(private paymentService: PaymentService) {}

    generatePaymentLink = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = Number(req.body.userId);
            const { amount } = req.body;

            const result = await this.paymentService.generatePaymentLink(userId, amount);
            res.status(200).json(result);
        } catch {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    handlePaymentCallback = async (req: Request, res: Response): Promise<void> => {
        await this.paymentService.handlePaymentCallback(req, res);
    }
}

export default PaymentController;
