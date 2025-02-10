import puppeteer, { Page, Browser } from "puppeteer";
import { Data, MainCharacteristics } from "../interfaces/apartments";
import { BaseScraper } from "./BaseScraper";
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import pinecone from "../../pinecone";


class KrishaParser extends BaseScraper {
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
        this.pageQueue = new Queue('pageQueueKrishaBuy', { connection: this.redisConnection });
        this.apartmentQueue = new Queue('apartmentQueueKrishaBuy', { connection: this.redisConnection });

        this.pageWorker = new Worker('pageQueueKrishaBuy', async job => {
            await this.scrapePage(job);
        }, { connection: this.redisConnection, concurrency: 1 });

        this.pageWorker.on('completed', job => console.log(`Page job ${job.id} completed`));
        this.pageWorker.on('failed', (job, err) => console.error(`Page job ${job?.id} failed with ${err}`));
    }

    private async createBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
        this.browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    }

    public async scrapeApartment(job: Job<{ link: string }>): Promise<void> {
        let detailPage: Page | null = null;
        try {
            const { link } = job.data;
            detailPage = await this.browser!.newPage();
            const userAgent = super.getRandomUserAgent();
            await detailPage.setUserAgent(userAgent);

            // Remove the default navigation timeout
            await detailPage.setDefaultNavigationTimeout(0);

            // Navigate to the page and wait for network to be idle
            await detailPage.goto(link, { waitUntil: 'networkidle0' });

            // Wait for specific elements that indicate the content has loaded
            await detailPage.waitForSelector('div.offer__sidebar', { timeout: 60000 }).catch(() => {});
            await detailPage.waitForSelector('div.offer__parameters', { timeout: 60000 }).catch(() => {});

            let description = '';
            const descriptionElement = await detailPage.$('div.js-description.a-text.a-text-white-spaces');

            if (descriptionElement) {
                description = await detailPage.$eval('div.js-description.a-text.a-text-white-spaces', el => el.textContent || '');
                description = description.replace(/\n/g, ' ');
            } else {
                description = "Нет описания";
            }

            const characteristics = await detailPage.$$eval('div.offer__parameters dl', items => {
                const itemData: { [key: string]: string } = {};
                if (items.length > 0) {
                    items.forEach(item => {
                        const key = item.querySelector('dt')?.textContent;
                        const value = item.querySelector('dd')?.textContent;
                        if (key && value) {
                            itemData[key] = value;
                        }
                    });
                }
                return itemData;
            });

            let price = 0;
            let priceElement = await detailPage.$('div.offer__price');
            if (priceElement) {
                price = await detailPage.$eval('div.offer__price', el => {
                    const priceText = el.textContent || '';
                    const priceNumber = parseInt(priceText.replace(/\s|₸/g, ''), 10);
                    return priceNumber;
                });
            } else {
                price = await detailPage.$eval('p.offer__price', el => {
                    const priceText = el.textContent || '';
                    const priceNumber = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
                    return priceNumber;
                });
            }

            const floor = await detailPage.$eval('div.offer__advert-title h1', el => {
                let floorText = el.textContent || '';
                floorText = floorText.trim();
                const splitText = floorText.split('этаж');
                if (splitText.length > 1) {
                    floorText = `${splitText[0]}этаж`;
                }
                return floorText;
            });

            const location = await detailPage.$eval('div.offer__advert-title h1', el => {
                let text = el.textContent || '';
                text = text.trim();

                const splitText = text.split('этаж');
                let floorText = '';
                if (splitText.length > 1) {
                    floorText = `${splitText[0]}этаж`;
                }

                const locationText = text.split(', ').pop() || '';
                return locationText;
            });

            const photos = await detailPage.$$eval('div.gallery__small-item', elements =>
                elements.map(el => el.getAttribute('data-photo-url') || '')
            );

            await detailPage.waitForSelector('button.show-phones').catch(() => {});
            await detailPage.click('button.show-phones').catch(() => {});

            let number = '';
            try {
                await detailPage.waitForSelector('div.offer__contacts-phones p');
                number = (await detailPage.$eval('div.offer__contacts-phones p', el => el.textContent || '')).trim();
            } catch (error) {
                const isPhoneNumberHidden = await detailPage.$('div.a-phones__hidden span.phone') !== null;
                if (isPhoneNumberHidden) {
                    const phoneNumber = await detailPage.$eval('div.a-phones__hidden span.phone', el => el.textContent || '');
                    if (phoneNumber.includes('*')) {
                        number = "+7 *** *** ****";
                    }
                }
            }

            const mainCharacteristics: MainCharacteristics = { price, location, floor, number, photos };
            const site = "krisha";
            const type = "buy";

            const apartmentData: Data = { link, characteristics, mainCharacteristics, description, site, type };
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
            const links = await page.$$eval('a.a-card__title', anchors => anchors.map(anchor => anchor.href));

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
            this.apartmentWorker = new Worker('apartmentQueueKrishaBuy', async job => {
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
                const pageUrl = `https://krisha.kz/prodazha/kvartiry/almaty/?das[_sys.hasphoto]=1&das[who]=1&page=${currentPage}`;
                await this.pageQueue.add('scrapePage', { pageUrl }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
                currentPage++;
                await new Promise(resolve => setTimeout(resolve, super.getRandomDelay(1000, 3000)));
            }

            await this.waitForQueueCompletion(this.pageQueue);
            this.startApartmentWorker();
            await this.waitForQueueCompletion(this.apartmentQueue);
        } catch (error) {
            console.error('Error in KrishaParser:', error);
        } finally {
            const currentDate = new Date();
            const indexName = "homespark2";
            const index = pinecone.index(indexName);
            await super.deleteOlderThanDate(index, currentDate, "buy", "krisha");
            await this.browser?.close();
        }
    }
}

export default KrishaParser;
