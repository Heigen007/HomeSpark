import { Apartment, User } from "@prisma/client";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || 'redis://';
console.log(`Connecting to Redis at ${redisUrl}`);
const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
});


class WhatsappService {
    async addApartmentAndUserToQueue(apartment: Apartment, user: User) {
        // apartment.number = "87089297838"
        // user.phoneNumber = "+7 (708) 534 0835"
        let apartmentNumber = apartment.number.replace(/\D/g, '');

        if(user.phoneNumber === null) throw new Error('Phone number must be provided');

        let userPhoneNumber = user.phoneNumber.replace(/\D/g, '');

        // Check if the length is not equal to 11
        if (apartmentNumber.length !== 11 || userPhoneNumber.length !== 11) {
            throw new Error('Phone number must be 11 digits');
        }

        // Check if the first number equals 8 or 7
        if(apartmentNumber[0] !== '8' && apartmentNumber[0] !== '7') {
            throw new Error('Phone number must start with 8 or 7');
        }
        if (apartmentNumber[0] === '8') apartmentNumber = '7' + apartmentNumber.slice(1);
        if (userPhoneNumber[0] === '8') userPhoneNumber = '7' + userPhoneNumber.slice(1);

        // Add "+" to the start of the string
        apartment.number = '+' + apartmentNumber;
        user.phoneNumber = '+' + userPhoneNumber;
        
        const job = {
            user: user,
            apartment: apartment
        };

        const jobJson = JSON.stringify(job);

        await redisConnection.rpush('phoneQueue', jobJson);
        return { message: 'Apartment and user added to queue' };
    }
}

export default WhatsappService;