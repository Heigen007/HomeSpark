import prisma from "../db";
import { User } from "@prisma/client";

class UserService{
    async getUserInfo(userId: number): Promise<any | null> {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) return null;
        return { id:user.id, email: user.email, name: user.name, surname: user.surname, phoneNumber: user.phoneNumber, 
            smallDescription: user.smallDescription,
            age: user.age, tokenBalance: user.tokenBalance};
    }

    async updateUser(userId: number, user: User): Promise<any | null> {
        const updatedUser = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                name: user.name,
                surname: user.surname,
                phoneNumber: user.phoneNumber,
                smallDescription: user.smallDescription,
                age: user.age
            }
        })

        if (!updatedUser) return null;
        return { email: updatedUser.email, name: updatedUser.name, surname: updatedUser.surname, phoneNumber: updatedUser.phoneNumber, 
            smallDescription: updatedUser.smallDescription,
            age: updatedUser.age };
    }

}

export default UserService;