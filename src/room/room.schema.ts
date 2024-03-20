import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type RoomDocument = HydratedDocument<Room>;

@Schema()
export class Room {
  @Prop({ required: true, trim: true, unique: true })
  key: string;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  members: string[];
}

export const RoomSchema = SchemaFactory.createForClass(Room);
