import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type RoomDocument = HydratedDocument<Room>;

// export class Player {
//   @Prop({type: [{type: Number}]})
//   point: number[];

//   @Prop({type: Number})
//   mistake: number;

//   @Prop({type: Boolean})
//   is_playing: boolean;

//   @Prop({type: Number})
//   set_won: number;
// }

@Schema()
export class Room {
  @Prop({ required: true, trim: true, unique: true })
  key: string;

  @Prop({type: Boolean})
  is_elo: boolean;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  members: string[];

  @Prop({type: [{type: Number}]})
  games: number[];

  @Prop({type: String})
  user1: string;

  @Prop({type: String})
  user2: string;

  @Prop({type: Number})
  current_round: number;

  @Prop({type: Boolean})
  is_end_game: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
