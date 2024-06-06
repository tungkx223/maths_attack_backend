import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { UserModule } from './user/user.module';
import { RoomModule } from './room/room.module';
import { AuthModule } from './auth/auth.module';
import { GetUsernameMiddleware } from './app.middleware';
import { AuthController } from './auth/auth.controller';
import { UserController } from './user/user.controller';
import { RoomController } from './room/room.controller';
import { AppGateway } from './app.gateway';

@Module({
  imports: [
    UserModule,
    RoomModule,
    AuthModule,
    MongooseModule.forRoot('mongodb+srv://XuanTung:hRLcDoQjYyjyOPwO@cluster0.kkonh7o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'),
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
