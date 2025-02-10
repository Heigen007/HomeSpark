import { Pinecone } from "@pinecone-database/pinecone";

class PineconeClient {
    private client: Pinecone;

    constructor() {
        this.client = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY as string,
        });
        console.log("Successfully initialized Pinecone client");
    }

    public getClient(): Pinecone {
        return this.client;
    }
}

const pineconeClient = new PineconeClient();
export default pineconeClient.getClient();