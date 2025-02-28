// import MapsController from "./maps-controller";
// import MapsService from "./maps-service";
// import { Router } from "express";

// const mapsRouter = Router();
// const mapsService = new MapsService();
// const mapsController = new MapsController(mapsService);

// mapsRouter.post('/geocode', mapsController.geocodeAddress);

// export default mapsRouter;

import { Router } from "express";
import MapsService from "./maps-service";
import MapsController from "./maps-controller";

const mapsRouter = Router();
const mapsService = new MapsService();
const mapsController = new MapsController(mapsService);

mapsRouter.post('/geocode', (req, res) => mapsController.geocodeAddress(req, res));

export default mapsRouter;
