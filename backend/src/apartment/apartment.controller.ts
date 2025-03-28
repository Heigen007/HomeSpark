import PaymentService from "../payment/payment-service";
import ApartmentService from "./apartment.service";

class ApartmentController {
    private apartmentService: ApartmentService;

    constructor(apartmentService: ApartmentService) {
        this.apartmentService = new ApartmentService();
    }

    getAllApartments = async (req,res) => {
        try {
            const apartments = await this.apartmentService.getAllApartments();
            if (!apartments) {
                res.status(404).json({ message: 'There are no apartments' });
                return;
              }
            res.status(200).json(apartments);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getApartmentById = async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const apartment = await this.apartmentService.getApartmentById(id);
            if (!apartment) {
                res.status(404).json({ message: 'Apartment not found' });
                return;
              }
            res.status(200).json(apartment);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getBuyApartments = async (req, res) => {
        try {
            const apartments = await this.apartmentService.getBuyApartments();
            if (!apartments) {
                res.status(404).json({ message: 'There are no buy apartments' });
                return;
              }
            res.status(200).json(apartments);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getRentApartments = async (req, res) => {
        try {
            const apartments = await this.apartmentService.getRentApartments();
            if (!apartments) {
                res.status(404).json({ message: 'There are no rent apartments' });
                return;
              }
            res.status(200).json(apartments);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getDailyApartments = async (req, res) => {
        try {
            const apartments = await this.apartmentService.getDailyApartments();
            if (!apartments) {
                res.status(404).json({ message: 'There are no daily apartments' });
                return;
              }
            res.status(200).json(apartments);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getApartmentByLink = async (req, res) => {
        try {
            const link = req.body.link;
            const apartment = await this.apartmentService.getApartmentByLink(link);
            if (!apartment) {
                res.status(404).json({ message: 'Apartment not found' });
                return;
              }
            res.status(200).json(apartment);
        }
        catch{
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getRecommendation = async (req, res) => {
        try{
            const buy = await PaymentService.spendTokens(req.body.userId, 1);
            if(!buy){
                res.status(405).json({error: 'Not enough tokens'});
                return;
            }
            const prompt = req.body.prompt
            const classify = req.body.classify;
            let minPrice = req.body.minPrice;
            let maxPrice = req.body.maxPrice;
            let rooms = req.body.rooms;
            if(maxPrice < minPrice){
                res.status(400).json({error: 'maxPrice must be greater than minPrice'});
                return;
            }
            if(minPrice < 0 || maxPrice < 0){
                res.status(400).json({error: 'Prices must be positive'});
                return;
            }
            if(!maxPrice){
                maxPrice = 1000000000;
            }
            if(!minPrice){
                minPrice = 0;
            }
            if(!rooms){
                rooms = '';
            }
            const apartments = await this.apartmentService.getRecommendations(prompt, classify, minPrice, maxPrice, rooms)

            if(!apartments){
                res.status(404).json({ message: 'No such apartments' });
                return;
            }

            res.status(200).json(apartments)
        }
        catch(error) {
            console.log(error);
            
            res.status(500).json({error: 'Internal server error'});
        }
    }

    getMightLike = async (req, res) => {
        try{
            const prompt = req.body.prompt
            const classify = req.body.classify;
            let minPrice = req.body.minPrice;
            let maxPrice = req.body.maxPrice;
            let rooms = req.body.rooms;
            if(maxPrice < minPrice){
                res.status(400).json({error: 'maxPrice must be greater than minPrice'});
                return;
            }
            if(minPrice < 0 || maxPrice < 0){
                res.status(400).json({error: 'Prices must be positive'});
                return;
            }
            if(!maxPrice){
                maxPrice = 1000000000;
            }
            if(!minPrice){
                minPrice = 0;
            }
            if(!rooms){
                rooms = '';
            }
            const apartments = await this.apartmentService.getMightLikeApartments(prompt, classify, minPrice, maxPrice, rooms)

            if(!apartments){
                res.status(404).json({ message: 'No such apartments' });
                return;
            }

            res.status(200).json(apartments)
        }
        catch (error) {
            console.log(error)
            res.status(500).json({error: 'Internal server error'});
        }
    }
}

export default ApartmentController