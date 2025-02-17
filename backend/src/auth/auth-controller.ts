import { Request, Response } from 'express';
import { CreateUserDto } from './dtos/CreateUser.dto';
import AuthService from './auth-service';

class AuthController {
    private authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    registerUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const createUserDto: CreateUserDto = req.body;
            const user = await this.authService.registerUser(createUserDto);
            res.status(201).json(user);
        } catch (err) {
            res.status(500).json({ message: 'Error registering user' });
        }
    }

    loginUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.loginUser(email, password);
            if (!result) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error logging in' });
        }
    }

    refreshToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { token } = req.body;
            const result = await this.authService.refreshToken(token);
            if (!result) {
                res.status(401).json({ message: 'Invalid or expired refresh token' });
                return;
            }
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error refreshing token' });
        }
    }

    checkBothTokens = async (req: Request, res: Response): Promise<void> => {
        try {
            const { accessToken, refreshToken } = req.body;
            const result = await this.authService.checkBothTokens(accessToken, refreshToken);
            if (!result) {
                res.status(401).json({ message: 'Invalid or expired tokens' });
                return;
            }
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error checking tokens' });
        }
    }

    loginWithGoogle = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ message: 'Token is required' });
            }

            const result = await this.authService.loginWithGoogle(token);
            if (!result) {
                return res.status(401).json({ message: 'Invalid token or user not found' });
            }

            res.json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error logging in with Google' });
        }
    }

    getUserIdByToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ message: 'Token is required' });
            }

            const result = await this.authService.getUserIdByToken(token);
            if (!result) {
                return res.status(401).json({ message: 'Invalid token or user not found' });
            }

            res.json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error getting user id by token' });
        }
    }
}

export default AuthController;