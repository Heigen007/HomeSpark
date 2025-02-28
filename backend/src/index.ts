import 'dotenv/config';
import express from 'express';
import globalRouter from './global-router';
import { logger } from './logger';
import cors from 'cors'

const app = express();
const PORT = process.env.PORT || 3838;

app.use(cors());

app.use(logger);
app.use(express.json());
app.use('/api/v1/', globalRouter);

app.listen(PORT, () => {
    console.log(`Server runs at http://localhost:${PORT}`);
})