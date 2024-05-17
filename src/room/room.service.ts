import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';

import { Room, RoomDocument } from './room.schema';
import { FULL_MEMBER, ROOM_NOT_FOUND, SUCCESSFUL } from 'src/returnCode';
import { User, UserDocument } from 'src/user/user.schema';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

  async getRoomInfo(roomKey: string): Promise<any> {
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
      members: [owner],
      user1: {
        point: [0, 0, 0, 0, 0],
        mistake: 0,
        setWon: 0,
        isPlaying: false,
      },
      user2: {
        point: [0, 0, 0, 0, 0],
        mistake: 0,
        setWon: 0,
        isPlaying: false,
      },
      current_round: 0,
      isEndGame: false,
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

  async checkStartGame(roomKey: string) {
    const room = await this.roomModel.findOne({key: roomKey});
    if (room.members.length != 2) return {
      code: 0,
      data: {},
    }

    const user1 = await this.userModel.findById(room.members[0]);
    const user2 = await this.userModel.findById(room.members[1]);

    var numbers = [0, 1, 2, 3, 4, 5, 6, 7];
    numbers.sort(() => Math.random() - 0.5);
    var games = numbers.slice(0, 5);

    return {
      code: 1,
      data: {
        games: games,
        user1: {
          username: user1.username,
          elo: user1.elo,
          score: [0, 0, 0, 0, 0],
        },
        user2: {
          username: user2.username,
          elo: user2.elo,
          score: [0, 0, 0, 0, 0],
        },
      },
    }
  }

  async userEndSet(roomKey: string, userCode: number) {
    const room = await this.roomModel.findOne({key: roomKey});
    if (userCode >= 2) return {
      code: 0, 
      data: {},
    }

    if (userCode == 0) {
      room.user1.isPlaying = false;
    } else {
      room.user2.isPlaying = false;
    }

    // cả 2 người chơi đều hoàn thành phần chơi
    if (!room.user1.isPlaying && !room.user2.isPlaying) {
      var u1point = room.user1.point[room.current_round];
      var u2point = room.user2.point[room.current_round];
      var outcome: number;
      
      if (u1point > u2point) {
        room.user1.setWon = room.user1.setWon + 1;
        outcome = 0;
      } else if (u2point > u1point) {
        room.user2.setWon = room.user2.setWon + 1;
        outcome = 1;
      } else {
        room.user1.setWon = room.user1.setWon + 0.5;
        room.user2.setWon = room.user2.setWon + 0.5;
        outcome = 2;
      }
      room.current_round += 1;
      
      // outcome:
      // 0: user1 thắng
      // 1: user2 thắng
      // 2: kết quả hòa
      return {
        code: 1,
        data: {
          user1_point: u1point,
          user2_point: u2point,
          outcome: outcome,
        },
      }
    } else {
      return {
        code: 0,
        data: {},
      }
    }
  }

  async userStartSet(roomKey: string, userCode: number) {
    if (userCode >= 2) return {
      code: 0, 
      data: {},
    }

    const room = await this.roomModel.findOne({key: roomKey});

    if (userCode == 0) {
      room.user1.isPlaying = true;
    } else {
      room.user2.isPlaying = true;
    }

    if (room.user1.isPlaying && room.user2.isPlaying) {
      room.user1.mistake = 0;
      room.user2.mistake = 0;

      return {
        code: 1,
        data: {
          currentRound: room.current_round,
        },
      }
    } else {
      return {
        code: 0, 
        data: {},
      }
    }
  }

  async userSubmit(roomKey: string, userCode: number, setCode: number, addedPoint: number) {
    if (userCode >= 2 || setCode >= 5) {
      return {
        code: 0,
        data: {},
      }
    }

    const room = await this.roomModel.findOne({key: roomKey});
    if (userCode == 0) {
      if (addedPoint != 0) {
        room.user1.point[setCode] += addedPoint;
      } else {
        room.user1.mistake++;
      }

      return {
        code: 1,
        data: {
          player: 0,
          setCode: setCode,
          point: room.user1.point[setCode],
          mistake: room.user1.mistake,
        },
      };
    } else {
      if (addedPoint != 0) {
        room.user2.point[setCode] += addedPoint;
      } else {
        room.user2.mistake++;
      }

      return {
        code: 1,
        data: {
          player: 1,
          setCode: setCode,
          point: room.user2.point[setCode],
          mistake: room.user2.mistake,
        },
      };
    }
  }

  async getResultAfterSet(roomKey: string) {
    const room = await this.roomModel.findOne({key: roomKey});
    
    if (room.user1.setWon >= 3 || room.user2.setWon >= 3) {
      room.isEndGame = true;
      return {
        code: 0,
        data: {
          isEndGame: true,
          user1_point: room.user1.point,
          user2_point: room.user2.point,
          user1_set: room.user1.setWon,
          user2_set: room.user2.setWon,
        }
      }
    }

    return {
      code: 0,
      data: {
        isEndGame: false,
        user1_point: room.user1.point,
        user2_point: room.user2.point,
        user1_set: room.user1.setWon,
        user2_set: room.user2.setWon,
      }
    }
  }
}
