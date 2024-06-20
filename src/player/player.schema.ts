import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type PlayerDocument = HydratedDocument<Player>;

@Schema()
export class Player {
	@Prop({type: String})
	key: string;

  @Prop({type: [{type: Number}]})
  point: number[];
  
  @Prop({type: Number})
  mistake: number;
  
  @Prop({type: Boolean})
  is_playing: boolean;
  
  @Prop({type: Number})
  set_won: number;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);