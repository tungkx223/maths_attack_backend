import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { SUCCESSFUL, USER_IN_USE, WRONG_PASSWORD, WRONG_USERNAME } from 'src/returnCode';
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

    if (user.refresh_token) return {
      code: USER_IN_USE,
      message: "This account is already in use.",
      data: {},
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

  isRefreshTokenExpired(token: string, secret: string): boolean {
    try {
      // Giải mã token mà không cần xác thực để lấy thông tin về thời gian hết hạn
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  
      // Kiểm tra thời gian hiện tại với thời gian hết hạn của token
      
      // Thời gian hiện tại (tính bằng giây)
      const currentTime = Math.floor(Date.now() / 1000);

      // Nếu token không có `exp` thì coi như đã hết hạn
      return decoded.exp ? currentTime > decoded.exp : true; 
    } catch (error) {
      // Nếu xảy ra lỗi trong quá trình giải mã (ví dụ token không hợp lệ), ta coi như token đã hết hạn
      return true;
    }
  }

  async refreshTokens(username: string, refreshToken: string) {
    // find user by username
    const user = await this.userService.findUser(username);

    // check user exists and user's refresh token
    if (!user || !user.refresh_token) {
      throw new ForbiddenException('Access denied');
    }

    // check refresh token expired
    if (this.isRefreshTokenExpired(refreshToken, jwtConstants.refresh_secret)) {
      await this.userService.updateRefreshToken(username, null);
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
          expiresIn: '30d',
        }
      ),
    ]);

    return {accessToken, refreshToken};
  }
}
