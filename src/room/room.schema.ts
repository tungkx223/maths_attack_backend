import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type RoomDocument = HydratedDocument<Room>;

export class Player {
  @Prop({type: [{type: Number}]})
  point: number[];

  @Prop({type: Number})
  mistake: number;

  @Prop({type: Boolean})
  isPlaying: boolean;

  @Prop({type: Number})
  setWon: number;
}

@Schema()
export class Room {
  @Prop({ required: true, trim: true, unique: true })
  key: string;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  members: string[];

  @Prop({type: [{type: Number}]})
  games: number[];

  @Prop({type: [{type: Player}]})
  user1: Player;

  @Prop({type: [{type: Player}]})
  user2: Player;

  @Prop({type: Number})
  current_round: number;

  @Prop({type: Boolean})
  isEndGame: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
