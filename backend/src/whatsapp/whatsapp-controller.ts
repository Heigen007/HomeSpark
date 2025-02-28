import WhatsappService from "./whatsapp-service";
import { Request, Response } from "express";

class WhatsappController{
    private whatsappService: WhatsappService;

    constructor(whastappService: WhatsappService){
        this.whatsappService = whastappService;
    }

    addApartmentAndUserToQueue = async(req: Request, res: Response): Promise<void>=> {
        try{
            const { apartment, user } = req.body;
            const result = await this.whatsappService.addApartmentAndUserToQueue(apartment, user);
            res.status(200).json(result);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }
}

export default WhatsappController;