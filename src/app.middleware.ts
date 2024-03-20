import {
  Injectable, NestMiddleware, UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Response } from 'express';
import { UserService } from './user/user.service';

@Injectable()
export class GetUsernameMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  async use(req: any, res: Response, next: NextFunction) {
    // check authorization exists
    const authorization = req.headers.authorization;
    if (!authorization) throw new UnauthorizedException();
    
    // get user data from access token
    const userData = this.jwtService.decode(
      authorization.replace('Bearer ', ''),
      { json: true },
    ) as { username: string; id: string };
    
    if (!userData) throw new UnauthorizedException('token is not valid');

    // get username and user id from user data
    req.username = userData?.username;
    req.uid = userData?.id

    const user = await this.userService.findUserById(req.uid)
    if (!user) throw new UnauthorizedException('user not found');
    if (user.username !== req.username) throw new UnauthorizedException('wrong username');
    
    next();
  }
}