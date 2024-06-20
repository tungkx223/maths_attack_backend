import { MongooseModule } from "@nestjs/mongoose";
import { Player, PlayerSchema } from "./player.schema";
import { PlayerService } from "./player.service";
import { Module } from "@nestjs/common";

@Module({
  providers: [PlayerService],
  imports: [
    MongooseModule.forFeature([        
      { name: Player.name, schema: PlayerSchema }
    ]),
  ],
  exports: [PlayerService],
})
  
export class PlayerModule {}