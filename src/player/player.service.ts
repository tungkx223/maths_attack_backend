import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Player, PlayerDocument } from "./player.schema";
import { Model } from "mongoose";

@Injectable()
export class PlayerService {
  constructor(
    @InjectModel(Player.name)
    private readonly playerModel: Model<PlayerDocument>,
  ) {}

  async createPlayer(roomKey: string, playerNum: number) {
    var key = `${roomKey}_${playerNum}`;
    await new this.playerModel({
      key: key,
      point: [0, 0, 0, 0, 0],
      mistake: 0,
      set_won: 0,
      is_playing: false,
    }).save();

    return key;
  }

  async findPlayer(playerKey: string): Promise<PlayerDocument> {
    return await this.playerModel.findOne({key: playerKey});
  }

  async setPlay(playerKey: string, is_playing: boolean) {
    return await this.playerModel.findOneAndUpdate(
      {key: playerKey},
      {is_playing: is_playing},
      {new: true},
    );
  }

  async startNewSet(playerKey: string) {
    await this.playerModel.findOneAndUpdate(
      {key: playerKey},
      {mistake: 0},
    );
  }

  async addedPoint(playerKey: string, addedPoint: number, setCode: number): Promise<PlayerDocument> {
    const player = await this.playerModel.findOne({key: playerKey});
    if (!player) return player;
    
    if (addedPoint !== 0) {
      player.point[setCode] += addedPoint;
    } else {
      player.mistake++;
    }

    return await this.playerModel.findOneAndUpdate(
      {key: playerKey},
      {point: player.point, mistake: player.mistake},
      {new: true},
    );
  }

  async updateAfterSet(playerKey: string, set_point: number) {
    const player = await this.playerModel.findOne({key: playerKey});
    player.set_won = player.set_won + set_point;
    await this.playerModel.findOneAndUpdate(
      {key: playerKey},
      {set_won: player.set_won},
    );
  }

  async getSetWon(playerKey: string) {
    const player = await this.playerModel.findOne({key: playerKey});
    if (!player) return -1;
    return player.set_won;
  }

  async leaveRoom(playerKey: string) {
    await this.playerModel.findOneAndUpdate(
      {key: playerKey},
      {is_playing: false},
    );
  }

  async deletePlayer(playerKey: string) {
    await this.playerModel.findOneAndDelete({key: playerKey});
  } 
}