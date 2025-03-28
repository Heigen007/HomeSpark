import prisma from "../db";
import dotenv from 'dotenv';
import { Request, Response } from 'express';
const Robokassa = require('node-robokassa');

dotenv.config();

const robokassaHelper = new Robokassa.RobokassaHelper({
    merchantLogin: process.env.ROBO_MERCHANT_LOGIN,
    hashingAlgorithm: 'md5',
    password1: process.env.ROBO_PASS1_TEST,
    password2: process.env.ROBO_PASS2_TEST,
    testMode: true
});

class PaymentService {
    async generatePaymentLink(userId: number, amount: number): Promise<{ paymentUrl: string, paymentKey: string }> {
        const paymentKey = `${Date.now()}${Math.floor(Math.random() * 1000)}`; // числовой id для InvId
        const invDesc = `Покупка ${amount} токенов`;

        const options = {
            invId: 1,
            email: '',
            outSumCurrency: 'KZT',
            isTest: true,
            userData: {
                userId,
                amount
            }
        };

        const paymentUrl = robokassaHelper.generatePaymentUrl(amount * 100, invDesc, options);
        return { paymentUrl, paymentKey };
    }

    async handlePaymentCallback(req: Request, res: Response): Promise<void> {
        const { OutSum, InvId, Shp_userId, SignatureValue } = req.query;

        if (!OutSum || !InvId || !Shp_userId || !SignatureValue) {
            res.status(400).json({ error: 'Invalid callback data' });
            return;
        }

        // Проверка подписи Robokassa
        const isValid = robokassaHelper.checkResultUrlSignature(req.query);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid signature' });
            return;
        }

        const amount = parseInt(OutSum.toString());
        const userId = parseInt(Shp_userId.toString());

        if (isNaN(amount) || isNaN(userId)) {
            res.status(400).json({ error: 'Invalid user or amount' });
            return;
        }

        // Обновляем токены
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { tokenBalance: { increment: amount } }
            })
        ]);

        res.status(200).send(`OK${InvId}`);
    }

    static async spendTokens(userId: number, amount: number): Promise<boolean> {
        console.log(userId, amount);
        
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.tokenBalance < amount) {
                return false;
            }

            await prisma.user.update({
                where: { id: userId },
                data: { tokenBalance: { decrement: amount } }
            });

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
        
    }
}

export default PaymentService;
