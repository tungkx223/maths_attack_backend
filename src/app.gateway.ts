import {
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RoomGateway } from './room/room.gateway';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transport: ['polling'],
})
export class AppGateway {
  constructor(
    private readonly jwtService: JwtService,

    private readonly roomGateway: RoomGateway
  ) {}

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  async handleConnection(@ConnectedSocket() client: Socket) {
    if (!client.handshake.auth?.token) {
      client.disconnect();
      return;
    }

    const userData = this.jwtService.decode(client.handshake.auth?.token, {
      json: true,
    }) as { username: string; id: string };
    client.join(userData.id);
    client.handshake.auth.id = userData.id;

    this.logger.log(`client socket connected: ${client.id}`);
    this.logger.log(`client socket join room: ${userData.id}`);
    // console.log("connection to socket... token = ", client.handshake.query.token);
    
    client.on('disconnecting', (reason) => {
      this.logger.log(`client disconnected ${client.id}`);
      this.roomGateway.leaveRoom(client);
    })
  }

  // handleDisconnect(@ConnectedSocket() client: Socket) {
  //   console.log(client.rooms);
  // }
}
