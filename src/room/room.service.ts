import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Room, RoomDocument } from './room.schema';
import { FULL_MEMBER, ROOM_NOT_FOUND, SUCCESSFUL } from 'src/returnCode';
import { UserDocument } from 'src/user/user.schema';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
  ) {}

  async getAllRooms(): Promise<any> {
    const rooms = await this.roomModel.find({}).populate<{ members: UserDocument }>('members');

    return {
      code: SUCCESSFUL,
      message: 'get all rooms successfully',
      data: {
        room_list: rooms
      }
    }
  }

  async getRoomInfo(roomKey): Promise<any> {
    const room = await this.roomModel.findOne({key: roomKey}).populate<{ members: UserDocument }>('members');

    if (!room) return {
      code: ROOM_NOT_FOUND,
      message: 'room not found',
      data: {}
    }

    return {
      code: SUCCESSFUL,
      message: 'room information',
      data: {
        room_info: room
      }
    }
  }

  // make a random room id
  makeKey(length: number): string {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;

    // random characters of key
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }

    return result;
  }

  async createRoom(owner: string): Promise<string> {
    var roomKey = null;
    do {
      roomKey = this.makeKey(8)
    } while (await this.roomModel.findOne({key: roomKey}))

    await new this.roomModel({
      key: roomKey,
      members: [owner]
    }).save();

    return roomKey;
  }

  async joinRoom(newMember: string, roomKey: string): Promise<any> {
    const room = await this.roomModel.findOne({key: roomKey});

    if (!room) return {
      code: ROOM_NOT_FOUND,
      message: 'Room not found',
      data: {}
    }

    if (room.members.length > 1) return {
      code: FULL_MEMBER,
      message: 'Full member',
      data: {}
    }

    // add new member to member list
    const updateRoom = await this.roomModel.findOneAndUpdate(
      {key: roomKey},
      {members: [ ...room.members, newMember ]}
    ).populate<{ members: UserDocument }>('members')

    // await this.roomModel.findOne(
    //   {key: roomKey}
    // )

    return {
      code: SUCCESSFUL,
      message: 'join room successfully',
      data: updateRoom
    }
  }

  async leaveRoom(clientUID: string, roomKey: string): Promise<any> {
    const room = await this.roomModel.findOne({key: roomKey});

    if (room.members.length === 1) {
      await this.roomModel.findOneAndDelete({key: roomKey});
      return;
    }

    const members = room.members;
    const index = members.indexOf(clientUID);
    members.splice(index, 1);

    await this.roomModel.findOneAndUpdate(
      {key: roomKey},
      {members}
    )
  }
}
