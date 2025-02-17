import prisma from '../db';
import { CreateUserDto } from './dtos/CreateUser.dto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createClerkClient } from '@clerk/clerk-sdk-node';

dotenv.config();

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_API_KEY! });
class AuthService {
    private readonly jwtSecret = process.env.JWT_SECRET!
    private readonly jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!

    async registerUser(createUserDto: CreateUserDto): Promise<any> {
        const { email, password, username } = createUserDto;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        });

        return newUser;
    }

    async loginUser(email: string, password: string): Promise<{ user: any, accessToken: string, refreshToken: string } | null> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return null;

        const accessToken = this.generateJwt(user);
        const refreshToken = this.generateRefreshToken(user);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
            },
        });

        return { user, accessToken, refreshToken };
    }

    private generateJwt(user: any): string {
        return jwt.sign({ id: user.id, email: user.email }, this.jwtSecret, { expiresIn: '1h' });
    }

    private generateRefreshToken(user: any): string {
        return jwt.sign({ id: user.id, email: user.email }, this.jwtRefreshSecret, { expiresIn: '7d' });
    }

    verifyJwt(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (err) {
            return null;
        }
    }

    verifyRefreshToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtRefreshSecret);
        } catch (err) {
            return null;
        }
    }

    async verifyToken(token: string): Promise<any> {
        const payload = this.verifyJwt(token);
        if (!payload) return null;

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return null;

        return user;
    }

    async checkBothTokens(accessToken: string, refreshToken: string): Promise<{ user: any, accessToken: string, refreshToken: string } | null> {
        const payload = this.verifyJwt(accessToken);
        if (!payload) return null;

        if (!this.verifyRefreshToken(refreshToken)) return null;

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return null;

        const isRefreshTokenValid = await prisma.refreshToken.findFirst({
            where: {
                token: refreshToken,
                userId: user.id,
            },
        });

        if (!isRefreshTokenValid) return null;

        return { user, accessToken, refreshToken };
    }

    async refreshToken(oldToken: string): Promise<{ accessToken: string, refreshToken: string } | null> {
        const payload = this.verifyRefreshToken(oldToken);
        if (!payload) return null;

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return null;

        const newAccessToken = this.generateJwt(user);
        const newRefreshToken = this.generateRefreshToken(user);

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
            },
        });

        await prisma.refreshToken.delete({ where: { token: oldToken } });

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    async loginWithGoogle(token: string): Promise<{ user: any, accessToken: string, refreshToken: string } | null> {
        try {
            const clerkUser = await clerkClient.users.getUser(token);

            if (!clerkUser) return null;

            // Check if the user already exists in your database
            let user = await prisma.user.findUnique({ where: { email: clerkUser.emailAddresses[0].emailAddress } });

            if (!user) {
                // If the user doesn't exist, create a new user in your database
                user = await prisma.user.create({
                    data: {
                        email: clerkUser.emailAddresses[0].emailAddress,
                        username: clerkUser.username || (clerkUser.firstName ? clerkUser.firstName + clerkUser.lastName : ''),
                        password: '', // You might want to set a random password or handle this differently
                    },
                });
            }

            const accessToken = this.generateJwt(user);
            const refreshToken = this.generateRefreshToken(user);

            await prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId: user.id,
                },
            });

            return { user, accessToken, refreshToken };
        } catch (error) {
            console.error('Error in Google login:', error);
            return null;
        }
    }

    async getUserIdByToken(token: string): Promise<any | null> {
        const payload = this.verifyJwt(token);
        if (!payload) return null;

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return null;

        return { id: user.id };
    }

}

export default AuthService;