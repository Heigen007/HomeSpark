import 'dotenv/config';
import express from 'express';
import globalRouter from './global-router';
import KrishaParser from './parser/parsers/KrishaParser';
import NedvizhimostproParser from './parser/parsers/NedvizhimostproParser';

const app = express();
const PORT = process.env.PORT || 3939;
app.use(express.json());
app.use('/api/v1/',globalRouter);

app.get('/helloworld',(request,response) =>{
    response.send("Hello World!");
})

app.listen(PORT, () => {
    console.log(`Server runs at http://localhost:${PORT}`);
});

async function runScrapers() {
    try {
        await Promise.all([
            // (new KrishaParser).start().then(() => {
            //   console.log('Finished scraping for buy.');
            // }),

            (new NedvizhimostproParser).start().then(() => {
              console.log('Finished scraping for rent.');
            })
          ]);

        console.log('All scraping tasks completed.');
    } catch (error) {
        console.error('Error during scraping process:', error);
    }
}

runScrapers();