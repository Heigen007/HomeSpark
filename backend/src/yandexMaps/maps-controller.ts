import { Request, Response } from "express";
import MapsService from "./maps-service";

class MapsController {
    private mapsService: MapsService;

    constructor(mapsService: MapsService) {
        this.mapsService = mapsService;
    }

    async geocodeAddress(req: Request, res: Response) {
        const { address, characteristics } = req.body;
        try {
            const data = await this.mapsService.geocodeNotReadable(address, characteristics);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default MapsController;
