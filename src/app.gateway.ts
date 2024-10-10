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

  private readonly logger = new Logger(AppGateway.name);

  // Store timers to handle cleanup after permanent disconnection
  disconnectTimers = {};

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
    
    // Handle disconnection
    client.on('disconnect', (reason) => {
      console.log(`Client ${client.id} disconnected due to: ${reason}`);
  
      // Set a timer for maxDisconnectionDuration to remove client from room if they do not reconnect
      // 10 seconds (same as maxDisconnectionDuration)
      const timer = setTimeout(() => {
        console.log(`Client ${client.id} failed to reconnect, removing from room1`);
        this.logger.log(`client disconnected ${client.id}`);
        this.roomGateway.leaveRoom(client);
        delete this.disconnectTimers[client.id];
      }, 10 * 1000);  
  
      this.disconnectTimers[client.id] = timer;
    });
  
    // Handle reconnection
    client.on('reconnect', () => {
      console.log(`Client ${client.id} reconnected`);
  
      // If the client reconnects, clear the disconnection timer
      if (this.disconnectTimers[client.id]) {
        clearTimeout(this.disconnectTimers[client.id]);
        delete this.disconnectTimers[client.id];
      }
    });
  }
}
