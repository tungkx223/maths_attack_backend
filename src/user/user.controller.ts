import { Controller, Logger } from '@nestjs/common';
import { UserService } from './user.service';

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
}
