import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true, trim: true, unique: true })
  username: string;

  @Prop({ required: true, trim: true })
  password: string;

  @Prop({ trim: true })
  name: string;

  @Prop()
  age: number;

  @Prop()
  refresh_token: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
