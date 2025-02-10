import puppeteer, { Page, Browser } from "puppeteer";
import { Data, MainCharacteristics } from "../interfaces/apartments";
import { BaseScraper } from "./BaseScraper";
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import pinecone from "../../pinecone";

class NedvizhimostproParser extends BaseScraper {
    private browser: Browser | null = null;
    private redisConnection: Redis;
    private pageQueue: Queue;
    private apartmentQueue: Queue;
    private apartmentWorker: Worker | null = null;
    private pageWorker: Worker;

    constructor() {
        super();
        const redisUrl = process.env.REDIS_URL || 'redis://';
        console.log(`Connecting to Redis at ${redisUrl}`);
        this.redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null, connectTimeout: 10000 });
        this.pageQueue = new Queue('pageQueueNedvizhimostproRent', { connection: this.redisConnection });
        this.apartmentQueue = new Queue('apartmentQueueNedvizhimostproRent', { connection: this.redisConnection });

        this.pageWorker = new Worker('pageQueueNedvizhimostproRent', async job => {
            await this.scrapePage(job);
        }, { connection: this.redisConnection, concurrency: 1 });

        this.pageWorker.on('completed', job => console.log(`Page job ${job.id} completed`));
        this.pageWorker.on('failed', (job, err) => console.error(`Page job ${job?.id} failed with ${err}`));

        // this.startApartmentWorker();
    }

    private async createBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
        this.browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    }

    private async scrapeApartment(job: Job<{ link: string }>): Promise<void> {
        let detailPage: Page | null = null;
        try {
            if (!this.browser) {
                await this.createBrowser();
            }
            const { link } = job.data;
            detailPage = await this.browser!.newPage();
            await detailPage.goto(link);
            await detailPage.setUserAgent(super.getRandomUserAgent());

            let description = await detailPage.$eval('div.descHid', el => el.textContent?.replace(/\n/g, ' ') || 'Нет описания');
            let price = await detailPage.$eval('div.price h2', el => parseInt(el.textContent?.replace(/\s|₸/g, '') || '0', 10));
            let floor = await detailPage.$eval('div.single_property_title.mt30-767 h2', el => el.textContent?.trim() || '');
            let location = await detailPage.$eval('div.single_property_title.mt30-767 p', el => el.textContent?.trim() || '');
            let photos = await detailPage.$$eval('div.owl-item a', elements => elements.map(el => el.getAttribute('href') || ''));
            let number = await detailPage.$eval('p.mb0', el => el.textContent?.trim() || '');

            const mainCharacteristics: MainCharacteristics = { price, location, floor, number, photos };
            const apartmentData: Data = { link, characteristics: {}, mainCharacteristics, description, site: "nedvizhimostpro", type: "rent" };
            await super.saveToDatabase(apartmentData);

            console.log(`Scraped and saved apartment: ${link}`);
        } catch (error) {
            console.error(`Error scraping link ${job.data.link}:`, error);
            await this.createBrowser();
            throw error;
        } finally {
            if (detailPage) await detailPage.close();
        }
    }

    private async scrapePage(job: Job<{ pageUrl: string }>): Promise<void> {
        let page: Page | null = null;
        try {
            if (!this.browser) {
                await this.createBrowser();
            }
            page = await this.browser!.newPage();
            await page.goto(job.data.pageUrl, { timeout: 60000 });
            await super.autoScroll(page);
            const links = await page.$$eval('div.feat_property.list div.thumb a', anchors => anchors.map(anchor => anchor.href).filter(href => href !== 'javascript:void(0)'));
            
            for (const link of links) {
                await this.apartmentQueue.add('scrapeApartment', { link }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
            }

            console.log(`Queued ${links.length} apartments from ${job.data.pageUrl}`);
        } catch (error) {
            console.error(`Error scraping page ${job.data.pageUrl}:`, error);
            await this.createBrowser();
            throw error;
        } finally {
            if (page) await page.close();
        }
    }

    private async waitForQueueCompletion(queue: Queue): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const checkQueue = async () => {
                const jobCounts = await queue.getJobCounts();
                if (jobCounts.waiting === 0 && jobCounts.active === 0) {
                    resolve();
                } else {
                    setTimeout(checkQueue, 2000);
                }
            };
            checkQueue().catch(reject);
        });
    }

    private startApartmentWorker() {
        if (!this.apartmentWorker) {
            this.apartmentWorker = new Worker('apartmentQueueNedvizhimostproRent', async job => {
                await this.scrapeApartment(job);
            }, { connection: this.redisConnection, concurrency: 1 });

            this.apartmentWorker.on('completed', job => console.log(`Apartment job ${job.id} completed`));
            this.apartmentWorker.on('failed', (job, err) => console.error(`Apartment job ${job?.id} failed with ${err}`));
        }
    }

    public async start(): Promise<void> {
        try {
            await this.createBrowser();
            let currentPage = 1;
            while (currentPage <= Number(process.env.PARSER_PAGE_LIMIT)) {
                const pageUrl = `https://nedvizhimostpro.kz/quicksearch/main/mainsearch?objType=1&city%5B0%5D=2&rooms=0&apType=5&price_Min=&price_Max=&square=&floor=0&page=${currentPage}`;
                await this.pageQueue.add('scrapePage', { pageUrl }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
                currentPage++;
                await new Promise(resolve => setTimeout(resolve, super.getRandomDelay(1000, 3000)));
            }

            await this.waitForQueueCompletion(this.pageQueue);
            await this.startApartmentWorker();
            await this.waitForQueueCompletion(this.apartmentQueue);
        } catch (error) {
            console.error('Error in NedvizhimostproParser:', error);
        } finally {
            const currentDate = new Date();
            const indexName = "homespark2";
            const index = pinecone.index(indexName);
            await super.deleteOlderThanDate(index, currentDate, "rent", "nedvizhimostpro");
            await this.browser?.close();
        }
    }
}

export default NedvizhimostproParser;
