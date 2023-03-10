import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as bcrypt from 'bcrypt';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {
    constructor (
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}




    async signupLocal (body: AuthDto): Promise<Tokens> {
        const hash = await this.hashData(body.password);
        const newUser = await this.prisma.user.create({
            data: {
                email: body.email,
                hash
            }
        });

        const tokens = await this.getTokens(newUser.id, newUser.email);
        await this.updateRtHash(newUser.id, tokens.refresh_token);
        
        return tokens;
    }


    signinLocal () {}    
    logout () {}
    refreshTokens () {}


    private hashData (data: string) {
        return bcrypt.hash(data, 10);
    } 

    private async getTokens (userId: number, email: string): Promise<Tokens> {
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync({
                sub: userId,
                email,
            }, {
                secret: 'at-secret',
                expiresIn: 60 * 15,
            }),
            this.jwtService.signAsync({
                sub: userId,
                email
            }, {
                secret: 'rt-secret',
                expiresIn: 60 * 60 * 24 * 7,
            })
        ])

        return {
            access_token: at,
            refresh_token: rt
        }
    }


    private async updateRtHash (userId: number, rt: string) {
        const hash = await this.hashData(rt);
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                hashedRt: hash
            }
        });
    }
}
