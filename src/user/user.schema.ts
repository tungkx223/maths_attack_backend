import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true, trim: true, unique: true })
  username: string;

  @Prop({ required: true, trim: true })
  password: string;

  @Prop()
  refresh_token: string;

  @Prop({required: true})
  elo: number;

  @Prop({required: true})
  win: number;

  @Prop({required: true})
  draw: number;

  @Prop({required: true})
  lose: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
