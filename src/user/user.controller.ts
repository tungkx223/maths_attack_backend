import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';

@Controller('api/user')
export class UserController {
  constructor(
    private readonly service: UserService,
  ) {}

  private readonly logger = new Logger(UserController.name);

  // Log function
  Logger(functionName: string, input: any = null) {
    this.logger.log(`Function: ${functionName} | input:`, input);
  }

  @Get('get-user-data')
  @UseGuards(AccessTokenGuard)
  async getUserData(@Req() req: any) {
    this.Logger('getUserData');
    return await this.service.getUserData(req.username);
  }
}
