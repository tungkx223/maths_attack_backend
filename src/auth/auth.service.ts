import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';

import { SUCCESSFUL, WRONG_PASSWORD, WRONG_USERNAME } from 'src/returnCode';
import { UserService } from 'src/user/user.service';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async signIn(username: string, password: string) {
    // find user by username
    const user = await this.userService.findUser(username);

    // check user exists
    if (!user) return {
      code: WRONG_USERNAME,
      message: 'Username does not exist',
      data: {}
    }

    // check password
    if (!(await compare(password, user.password))) return {
      code: WRONG_PASSWORD,
      message: 'Wrong password',
      data: {}
    }

    // generate access token and refresh token
    const tokens = await this.getToken(user.username, user._id.toString());
    await this.userService.updateRefreshToken(user.username, tokens.refreshToken);


    return {
      code: SUCCESSFUL,
      message: 'token',
      data: tokens
    }
  }

  async changePassword(username: string, oldPassword: string, newPassword: string) {
    // find user by username
    const user = await this.userService.findUser(username);

    // check old password
    if (!(await compare(oldPassword, user.password))) return {
      code: WRONG_PASSWORD,
      message: "Wrong old password",
      data: {}
    }

    // change password and return message
    return await this.userService.changePassword(username, newPassword);
  }

  async logout(username: string) {
    await this.userService.updateRefreshToken(username, null);
    return {
      code: SUCCESSFUL,
      message: 'Logged out',
      data: {}
    }
  }

  async refreshTokens(username: string, refreshToken: string) {
    // find user by username
    const user = await this.userService.findUser(username);

    // check user exists and user's refresh token
    if (!user || !user.refresh_token) {
      throw new ForbiddenException('Access denied');
    }

    // compare the refresh token
    if (!(await compare(refreshToken, user.refresh_token))) {
      throw new ForbiddenException('Access denied');
    }

    // generate new token
    const tokens = await this.getToken(username, user._id.toString());

    return {
      code: SUCCESSFUL,
      message: 'new token',
      data: tokens
    }
  }

  async getToken(username: string, id: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {id, username},
        {
          secret: jwtConstants.secret,
          expiresIn: '8h',
        }
      ),
      this.jwtService.signAsync(
        {id, username},
        {
          secret: jwtConstants.refresh_secret,
          expiresIn: '365d',
        }
      ),
    ]);

    return {accessToken, refreshToken};
  }
}
