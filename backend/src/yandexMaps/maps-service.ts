import openai from "../openai";


class MapsService {
    async createReadableAddress(address: string, characteristics: { [key: string]: string }): Promise<string> {
        const characteristicsString = Object.entries(characteristics)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `
                        Ты — географический информационный сервис Алматы, который идеально вычисляет улицы и дома.
                        Тебе поступил запрос на адрес: ${address}, который может состоять из различной информации, такой как город, перекресток, район, улица, номер дома и т. д. Твоя задача - взять из этого запроса информацию о улице и (если есть) номере дома, а также учесть дополнительные характеристики,в которых также может присутствовать Улица и Дом, сами характеристики: ${characteristicsString}.
                        Ответ должен быть строго в формате JSON, без каких-либо других сообщений.
                        JSON ответ должен выглядеть следующим образом:
                        {
                            "newAddress": "Аносова 30"
                        }
                        Входные данные будут представлены в виде строки, которую ты должен обработать и вернуть в формате JSON:
                        {
                            address: "Алматы, Аносова 30 - Алмалинский район",
                            characteristics: {
                                Улица: "Аносова",
                                дом: "30"
                            }
                        }
                    `
                },
                {
                    role: 'user',
                    content: `
                    Запрос пользователя: ${address}
                    Характеристики: ${characteristicsString}
                    `
                }
            ],
            stream: false
        });

        let messageContent = response.choices[0]?.message?.content || null;
        console.log('Received message content:', messageContent);

        if (!messageContent) {
            throw new Error('No content received from OpenAI');
        }
        // messageContent = messageContent.replace(/```json|```/g, '').trim();

        // return JSON.parse(messageContent);
        return messageContent.trim()
    
    }

    async geocode(address: string): Promise<any> {
        const query = encodeURIComponent(address.replace(';', '').trim());
          const ll = "76.9495,43.2295";
          const spn = "0.4216,0.2869";
          const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${query}&format=json&&ll=${ll}&spn=${spn}lang=ru_RU&bbox=76.77732,43.35107~77.07236,43.17431`);
          const data = await response.json();
          return data;
    }

    async geocodeNotReadable(address: string, characteristics: { [key: string]: string }): Promise<any> {
        const newAddressResponse = await this.createReadableAddress(address, characteristics);
        console.log('New address response:', newAddressResponse);
        
        // Parse the JSON string to get the newAddress value
        const newAddress = JSON.parse(newAddressResponse).newAddress;
        console.log('Parsed new address:', newAddress);
        
        return this.geocode(newAddress);
    }
}

export default MapsService;

