import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';
import { Room, RoomSchema } from './room.schema';
import { User, UserSchema } from 'src/user/user.schema';

@Module({
  providers: [RoomService, RoomGateway],
  controllers: [RoomController],
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema }
    ]),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }
    ]),
  ],
  exports: [RoomGateway]
})

export class RoomModule {}
