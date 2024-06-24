import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model, Types, set } from 'mongoose';

import { Room, RoomDocument } from './room.schema';
import { FULL_MEMBER, ROOM_NOT_FOUND, SUCCESSFUL } from 'src/returnCode';
import { User, UserDocument } from 'src/user/user.schema';
import { PlayerService } from 'src/player/player.service';
import { UserService } from 'src/user/user.service';
import { Player } from 'src/player/player.schema';

@Injectable()
export class RoomService {
  constructor(
    private playerService: PlayerService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

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

  async createRoom(owner: string, is_elo: boolean): Promise<string> {
    var roomKey = null;
    do {
      roomKey = this.makeKey(8)
    } while (await this.roomModel.findOne({key: roomKey}))

    const user1 = await this.playerService.createPlayer(roomKey, 1);
    const user2 = await this.playerService.createPlayer(roomKey, 2);

    await new this.roomModel({
      key: roomKey,
      is_elo: is_elo,
      members: [owner],
      user1: user1,
      user2: user2,
      current_round: 0,
      is_end_game: false,
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
      await this.playerService.deletePlayer(room.user1);
      await this.playerService.deletePlayer(room.user2);
      return {
        code: 0,
        index: -1,
        data: {},
      };
    }

    const members = room.members;
    const index = members.indexOf(clientUID);
    var data = {};

    // thoat game khi chua ket thuc game...
    if (!room.is_end_game) {
      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {is_end_game: true},
      );
      
      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);
      
      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;
  
      if (index === 0) {
        await this.playerService.leaveRoom(room.user1);
        var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 0, room.is_elo);
        var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 1, room.is_elo);
  
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
          outcome: 1,
          is_elo: room.is_elo,
          user1_set: 0,
          user2_set: 3,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }      
      } else {
        await this.playerService.leaveRoom(room.user2);
        var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 1, room.is_elo);
        var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 0, room.is_elo);
  
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
          outcome: 0,
          is_elo: room.is_elo,
          user1_set: 3,
          user2_set: 0,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }
      }
    }
    
    members.splice(index, 1);
    await this.roomModel.findOneAndUpdate(
      {key: roomKey},
      {members}
    )
    
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

    var user1: Player, user2: Player;
    if (userCode === 0) {
      user1 = await this.playerService.setPlay(room.user1, false);
      user2 = await this.playerService.findPlayer(room.user2);
    } else {
      user1 = await this.playerService.findPlayer(room.user1);
      user2 = await this.playerService.setPlay(room.user2, false);
    }

    console.log(user1.is_playing);
    console.log(user2.is_playing);

    // cả 2 người chơi đều hoàn thành phần chơi
    if (!user1.is_playing && !user2.is_playing) {
      var u1point = user1.point[room.current_round];
      var u2point = user2.point[room.current_round];
      var outcome: number;
      
      if (u1point > u2point) {
        await this.playerService.updateAfterSet(room.user1, 1);
        outcome = 0;
      } else if (u2point > u1point) {
        await this.playerService.updateAfterSet(room.user2, 1);
        outcome = 1;
      } else {
        await this.playerService.updateAfterSet(room.user1, 0.5);
        await this.playerService.updateAfterSet(room.user2, 0.5);
        outcome = 2;
      }

      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {current_round: room.current_round + 1},
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

    var user1: Player, user2: Player;
    if (userCode === 0) {
      user1 = await this.playerService.setPlay(room.user1, true);
      user2 = await this.playerService.findPlayer(room.user2);
    } else {
      user1 = await this.playerService.findPlayer(room.user1);
      user2 = await this.playerService.setPlay(room.user2, true);
    }

    if (!user1 || !user2) {
      return {
        code: 0,
        data: {},
      }
    }

    console.log(user1.is_playing);
    console.log(user2.is_playing);

    if (user1.is_playing && user2.is_playing) {
      await this.playerService.startNewSet(room.user1);
      await this.playerService.startNewSet(room.user2);

      return {
        code: 1,
        data: {},
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
      const player = await this.playerService.addedPoint(room.user1, addedPoint, setCode);
      return {
        code: 1,
        data: {
          player: 0,
          setCode: setCode,
          point: player.point[setCode],
          mistake: player.mistake,
        },
      };
    } else {
      const player = await this.playerService.addedPoint(room.user2, addedPoint, setCode);
      return {
        code: 1,
        data: {
          player: 1,
          setCode: setCode,
          point: player.point[setCode],
          mistake: player.mistake,
        },
      };
    }
  }

  newElo(youElo: number, oppElo: number, outcome: number, is_elo: boolean) {
    // outcome: 1 = win, 0 = lose, 0.5 = draw...
    if (!is_elo) return youElo;
    var expected_score = 1 / (1 + Math.pow(10, (oppElo - youElo) / 400));
    
    // coefficient = 16...
    var newElo = youElo + 16 * (outcome - expected_score);
    var newEloRounded = Math.round(newElo * 100) / 100;
    return newEloRounded;
  }

  async getGameResult(roomKey: string) {
    const room = await this.roomModel.findOne({key: roomKey});
    if (!room || room.is_end_game) {
      return {
        code: 0,
        data: {},
      }
    }

    var user1_setWon = await this.playerService.getSetWon(room.user1);
    var user2_setWon = await this.playerService.getSetWon(room.user2);
    if (user1_setWon === -1 || user2_setWon === -1) {
      return {
        code: 0,
        data: {},
      }
    }

    if (user1_setWon >= 3) {
      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {is_end_game: true},
      );

      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);

      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;

      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 1, room.is_elo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 0, room.is_elo);

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
          is_elo: room.is_elo,
          user1_set: user1_setWon,
          user2_set: user2_setWon,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }
      }
    }

    if (user2_setWon >= 3) {
      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {is_end_game: true},
      );

      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);

      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;

      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 0, room.is_elo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 1, room.is_elo);

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
          is_elo: room.is_elo,
          user1_set: user1_setWon,
          user2_set: user2_setWon,
          user1_oldElo: user1_oldElo,
          user1_newElo: user1_newElo,
          user2_oldElo: user2_oldElo,
          user2_newElo: user2_newElo,
        }
      }
    }

    if (user1_setWon === 2.5 && user2_setWon === 2.5) {
      await this.roomModel.findOneAndUpdate(
        {key: roomKey},
        {is_end_game: true},
      );

      var user1 = await this.userModel.findById(room.members[0]);
      var user2 = await this.userModel.findById(room.members[1]);

      var user1_oldElo = user1.elo;
      var user2_oldElo = user2.elo;

      var user1_newElo = this.newElo(user1_oldElo, user2_oldElo, 0.5, room.is_elo);
      var user2_newElo = this.newElo(user2_oldElo, user1_oldElo, 0.5, room.is_elo);

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
          outcome: 2,
          is_elo: room.is_elo,
          user1_set: user1_setWon,
          user2_set: user2_setWon,
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

    const user1 = await this.playerService.findPlayer(room.user1);
    const user2 = await this.playerService.findPlayer(room.user2);
    if (!user1 || !user2) {
      return {
        code: 0,
        data: {},
      }
    }

    return {
      code: 1,
      data: {
        current_round: room.current_round,
        user1_point:user1.point,
        user2_point: user2.point,
        user1_set: user1.set_won,
        user2_set: user2.set_won,
      },
    }
  }
}
