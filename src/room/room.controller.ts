import { Controller, Get, Logger, Param } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('api/room')
export class RoomController {
  constructor(
    private readonly service: RoomService,
  ) {}

  private readonly logger = new Logger(RoomController.name);

  // Log function
  Logger(functionName: string, input: any = null) {
    this.logger.log(`Function: ${functionName} | input:`, input);
  }

  @Get('all-room')
  async getAllRoom() {
    this.Logger('getAllRoom');

    return await this.service.getAllRooms();
  }

  @Get('room-info/:key')
  async getRoomInfo(@Param('key') roomKey: string) {
    this.Logger('getRoomInfo');

    return await this.service.getRoomInfo(roomKey);
  }
}
