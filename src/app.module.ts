import * as dotenv from 'dotenv';
dotenv.config();

import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { UserModule } from './user/user.module';
import { RoomModule } from './room/room.module';
import { AuthModule } from './auth/auth.module';
import { GetUsernameMiddleware } from './app.middleware';
import { AppGateway } from './app.gateway';
import { PlayerModule } from './player/player.module';

@Module({
  imports: [
    UserModule,
    RoomModule,
    AuthModule,
    PlayerModule,
    MongooseModule.forRoot(process.env.URI),
    JwtModule.register({})
  ],
  controllers: [],
  providers: [AppGateway],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GetUsernameMiddleware)
      // .exclude(
      //   { path: 'api/auth/signin', method: RequestMethod.ALL },
      //   { path: 'api/auth/signup', method: RequestMethod.ALL },
      // )
      .forRoutes(
        { path: 'api/auth/change-password', method: RequestMethod.ALL },
        { path: 'api/auth/refresh-token', method: RequestMethod.ALL },
        { path: 'api/auth/logout', method: RequestMethod.ALL },
        { path: 'api/user/get-user-data', method: RequestMethod.ALL, },
      )
  }
}
