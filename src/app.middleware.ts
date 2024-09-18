import {
  Injectable, NestMiddleware, HttpException,
  HttpStatus
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
    if (!authorization) throw new HttpException({
      code: HttpStatus.UNAUTHORIZED, 
      message: 'Unauthorized',
      data: {},
    }, HttpStatus.UNAUTHORIZED);
    
    // get user data from access token
    const userData = this.jwtService.decode(
      authorization.replace('Bearer ', ''),
      { json: true },
    ) as { username: string; id: string };
    
    if (!userData) throw new HttpException({
      code: HttpStatus.UNAUTHORIZED, 
      message: 'Unauthorized',
      data: {},
    }, HttpStatus.UNAUTHORIZED);

    // get username and user id from user data
    req.username = userData?.username;
    req.uid = userData?.id

    const user = await this.userService.findUserById(req.uid)
    if (!user) throw new HttpException({
      code: HttpStatus.UNAUTHORIZED, 
      message: 'User not found',
      data: {},
    }, HttpStatus.UNAUTHORIZED);
    
    if (user.username !== req.username) throw new HttpException({
      code: HttpStatus.UNAUTHORIZED, 
      message: 'Wrong username',
      data: {},
    }, HttpStatus.UNAUTHORIZED);
    
    next();
  }
}