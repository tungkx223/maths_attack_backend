import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model, Types, set } from 'mongoose';

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

  async createRoom(owner: string, isElo: boolean): Promise<string> {
    var roomKey = null;
    do {
      roomKey = this.makeKey(8)
    } while (await this.roomModel.findOne({key: roomKey}))

    await new this.roomModel({
      key: roomKey,
      isElo: isElo,
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
      return {
        code: 0,
        index: -1,
        data: {},
      };
    }

    const members = room.members;
    const index = members.indexOf(clientUID);
    
    room.isEndGame = true;
    var user1 = await this.userModel.findById(room.members[0]);
    var user2 = await this.userModel.findById(room.members[1]);
    
    var user1_oldElo = user1.elo;
    var user2_oldElo = user2.elo;

    var data: Object;
    if (index === 0) {
      room.user1.isPlaying = false;
      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 0, room.isElo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 1, room.isElo);

      var user1_win = user1.win + 1;
      var user2_lose = user2.lose + 1;

      await this.userModel.findByIdAndUpdate(
        room.members[0],
        {elo: user1_newElo, win: user1_win},
      );

      await this.userModel.findByIdAndUpdate(
        room.members[1],
        {elo: user2_newElo, lose: user2_lose},
      );

      data = {
        outcome: 1,
        isElo: room.isElo,
        user1_set: 0,
        user2_set: 3,
        user1_oldElo: user1_oldElo,
        user1_newElo: user1_newElo,
        user2_oldElo: user2_oldElo,
        user2_newElo: user2_newElo,
      }      
    } else {
      room.user2.isPlaying = false;
      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 1, room.isElo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 0, room.isElo);

      var user1_lose = user1.lose + 1;
      var user2_win = user2.win + 1;

      await this.userModel.findByIdAndUpdate(
        room.members[0],
        {elo: user1_newElo, lose: user1_lose},
      );

      await this.userModel.findByIdAndUpdate(
        room.members[1],
        {elo: user2_newElo, win: user2_win},
      );

      data = {
        outcome: 0,
        isElo: room.isElo,
        user1_set: 3,
        user2_set: 0,
        user1_oldElo: user1_oldElo,
        user1_newElo: user1_newElo,
        user2_oldElo: user2_oldElo,
        user2_newElo: user2_newElo,
      }
    }
    
    members.splice(index, 1);
    await this.roomModel.findOneAndUpdate(
      {key: roomKey},
      {members, user1: user1, user2: user2},
    );

    return {
      code: 1,
      index: index,
      data: data,
    };
  }

  async checkStartGame(roomKey: string) {
    const room = await this.roomModel.findOne({key: roomKey});
    if (!room || room.members.length !== 2) return {
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
        roomKey: roomKey,
        user1: {
          username: user1.username,
          elo: user1.elo,
        },
        user2: {
          username: user2.username,
          elo: user2.elo,
        },
      },
    }
  }

  async userEndSet(roomKey: string, userCode: number) {
    if (userCode >= 2) return {
      code: 0, 
      data: {},
    }

    const room = await this.roomModel.findOne({key: roomKey});
    if (!room || room.current_round >= 5) {
      return {
        code: 0,
        data: {},
      }
    }

    var updateRoom: Room;
    if (userCode === 0) {
      room.user1.isPlaying = false;
      updateRoom = await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user1: room.user1},
        {new: true},
      );
    } else {
      room.user2.isPlaying = false;
      updateRoom = await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user2: room.user2},
        {new: true},
      );
    }

    // cả 2 người chơi đều hoàn thành phần chơi
    if (!updateRoom.user1.isPlaying && !updateRoom.user2.isPlaying) {
      var u1point = updateRoom.user1.point[updateRoom.current_round];
      var u2point = updateRoom.user2.point[updateRoom.current_round];
      var outcome: number;
      
      if (u1point > u2point) {
        updateRoom.user1.setWon = updateRoom.user1.setWon + 1;
        outcome = 0;
      } else if (u2point > u1point) {
        updateRoom.user2.setWon = updateRoom.user2.setWon + 1;
        outcome = 1;
      } else {
        updateRoom.user1.setWon = updateRoom.user1.setWon + 0.5;
        updateRoom.user2.setWon = updateRoom.user2.setWon + 0.5;
        outcome = 2;
      }
      updateRoom.current_round += 1;

      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user1: updateRoom.user1, user2: updateRoom.user2, current_round: updateRoom.current_round},
      );
      
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
    if (!room) {
      return {
        code: 0,
        data: {},
      }
    }

    var updateRoom: Room;
    if (userCode === 0) {
      room.user1.isPlaying = true;
      updateRoom = await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user1: room.user1},
        {new: true},
      );
    } else {
      room.user2.isPlaying = true;
      updateRoom = await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user2: room.user2},
        {new: true},
      );
    }

    console.log(updateRoom.user1.isPlaying);
    console.log(updateRoom.user2.isPlaying);

    if (updateRoom.user1.isPlaying && updateRoom.user2.isPlaying) {
      updateRoom.user1.mistake = 0;
      updateRoom.user2.mistake = 0;

      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user1: updateRoom.user1, user2: updateRoom.user2},
      );

      return {
        code: 1,
        data: {
          current_round: updateRoom.current_round,
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
    if (!room) {
      return {
        code: 0,
        data: {},
      }
    }

    if (userCode === 0) {
      if (addedPoint !== 0) {
        room.user1.point[setCode] += addedPoint;
      } else {
        room.user1.mistake++;
      }

      const updateRoom = await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user1: room.user1},
        {new: true},
      );

      return {
        code: 1,
        data: {
          player: 0,
          setCode: setCode,
          point: updateRoom.user1.point[setCode],
          mistake: updateRoom.user1.mistake,
        },
      };
    } else {
      if (addedPoint !== 0) {
        room.user2.point[setCode] += addedPoint;
      } else {
        room.user2.mistake++;
      }

      const updateRoom = await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {user2: room.user2},
        {new: true},
      );

      return {
        code: 1,
        data: {
          player: 1,
          setCode: setCode,
          point: updateRoom.user2.point[setCode],
          mistake: updateRoom.user2.mistake,
        },
      };
    }
  }

  newElo(youElo: number, oppElo: number, outcome: number, isElo: boolean) {
    // outcome: 1 = win, 0 = lose, 0.5 = draw...
    if (!isElo) return youElo;

    var coeff = (youElo >= 2000) ? 10 : 20;
    var expected_score = 1 / (1 + Math.pow(10, (oppElo - youElo) / 400));
    var newElo = youElo + coeff * (outcome - expected_score);
    var newEloRounded = Math.round(newElo * 100) / 100;
    return newEloRounded;
  }

  async getGameResult(roomKey: string) {
    const room = await this.roomModel.findOne({key: roomKey});
    if (!room) {
      return {
        code: 0,
        data: {},
      }
    }
    
    if (room.user1.setWon >= 3) {
      room.isEndGame = true;
      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);

      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;

      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 1, room.isElo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 0, room.isElo);

      var user1_win = user1.win + 1;
      var user2_lose = user2.lose + 1;

      await this.userModel.findByIdAndUpdate(
        room.members[0],
        {elo: user1_newElo, win: user1_win},
      );

      await this.userModel.findByIdAndUpdate(
        room.members[1],
        {elo: user2_newElo, lose: user2_lose},
      );

      return {
        code: 1,
        data: {
          outcome: 0,
          isElo: room.isElo,
          user1_set: room.user1.setWon,
          user2_set: room.user2.setWon,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }
      }
    }

    if (room.user2.setWon >= 3) {
      room.isEndGame = true;
      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);

      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;

      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 0, room.isElo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 1, room.isElo);

      var user1_lose = user1.lose + 1;
      var user2_win = user2.win + 1;

      await this.userModel.findByIdAndUpdate(
        room.members[0],
        {elo: user1_newElo, lose: user1_lose},
      );

      await this.userModel.findByIdAndUpdate(
        room.members[1],
        {elo: user2_newElo, win: user2_win},
      );

      return {
        code: 1,
        data: {
          outcome: 1,
          isElo: room.isElo,
          user1_set: room.user1.setWon,
          user2_set: room.user2.setWon,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }
      }
    }

    if (room.user1.setWon === 2.5 && room.user2.setWon === 2.5) {
      room.isEndGame = true;
      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);

      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;

      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 0.5, room.isElo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 0.5, room.isElo);

      var user1_draw = user1.draw + 1;
      var user2_draw = user2.draw + 1;

      await this.userModel.findByIdAndUpdate(
        room.members[0],
        {elo: user1_newElo, draw: user1_draw},
      );

      await this.userModel.findByIdAndUpdate(
        room.members[1],
        {elo: user2_newElo, draw: user2_draw},
      );

      return {
        code: 1,
        data: {
          outcome: 1,
          isElo: room.isElo,
          user1_set: room.user1.setWon,
          user2_set: room.user2.setWon,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }
      }
    }

    return {
      code: 0,
      data: {},
    }
  }

  async displayScore(roomKey: string) {
    const room = await this.roomModel.findOne({key: roomKey});
    if (!room) {
      return {
        code: 0,
        data: {},
      }
    }

    return {
      code: 1,
      data: {
        current_round: room.current_round,
        user1_point: room.user1.point,
        user2_point: room.user2.point,
        user1_set: room.user1.setWon,
        user2_set: room.user2.setWon,
      },
    }
  }
}
