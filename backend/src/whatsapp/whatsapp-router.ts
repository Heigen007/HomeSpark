import WhatsappService from "./whatsapp-service";
import WhatsappController from "./whatsapp-controller";
import { Router } from "express";

const whatsappRouter = Router();
const whatsappService = new WhatsappService();
const whatsappController = new WhatsappController(whatsappService);

whatsappRouter.post('/add', (req, res) => whatsappController.addApartmentAndUserToQueue(req, res));

export default whatsappRouter;
