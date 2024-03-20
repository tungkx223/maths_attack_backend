import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';
import { Room, RoomSchema } from './room.schema';

@Module({
  providers: [RoomService, RoomGateway],
  controllers: [RoomController],
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema }
    ])
  ],
  exports: [RoomGateway]
})
export class RoomModule {}
