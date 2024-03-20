import { Body, Controller, Get, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { ChangePasswordDto, SignInDto, SignUpDto } from './auth.dto';
import { NULL_DATA } from 'src/returnCode';
import { AccessTokenGuard } from './guards/accessToken.guard';
import { RefreshTokenGuard } from './guards/refreshToken.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,

    private userService: UserService
  ) {}

  private readonly logger = new Logger(AuthController.name);

  // Log function
  Logger(functionName: string, input: any = null) {
    this.logger.log(`Function: ${functionName} | input:`, input);
  }

  @Post('signup')
  async signUp(@Body() signUpData: SignUpDto) {
    this.Logger('signUp', signUpData);

    if (!signUpData.username || !signUpData.password) {
      return {
        code: NULL_DATA,
        message: 'Please enter username and password',
        data: {}
      }
    }

    return await this.userService.createUser(signUpData);
  }

  @Post('signin')
  async signIn(@Body() signInData: SignInDto) {
    this.Logger('signIn', signInData);

    if (!signInData.username || !signInData.password) {
      return {
        code: NULL_DATA,
        message: 'Please enter username and password',
        data: {}
      }
    }

    return await this.authService.signIn(signInData.username, signInData.password);
  }

  @Get('logout')
  @UseGuards(AccessTokenGuard)
  async logout(@Req() req: any) {
    this.Logger('logout');
    return await this.authService.logout(req.username);
  }

  @Get('refresh-token')
  @UseGuards(RefreshTokenGuard)
  refreshToken(@Req() req: any) {
    this.Logger('refreshToken');

    // get refresh token from header
    const refreshToken = req.headers.authorization.replace('Bearer ', '');
    return this.authService.refreshTokens(req.username, refreshToken);
  }

  @Post('change-password')
  @UseGuards(AccessTokenGuard)
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Req() req: any) {
    this.Logger('changePassword', changePasswordDto);

    if (!changePasswordDto.oldPassword || !changePasswordDto.newPassword) return {
      code: NULL_DATA,
      message: 'Please enter old password, new password',
      data: {}
    }

    return await this.authService.changePassword(
      req.username,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword
    );
  }
}
