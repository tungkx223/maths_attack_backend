import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { SUCCESSFUL } from 'src/returnCode';

@WebSocketGateway()
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomService: RoomService,
  ) {}

  private readonly logger = new Logger(RoomGateway.name);

  Logger(functionName: string, input: any = null) {
    this.logger.log(`Function: ${functionName} | input: ${input}`);
  }

  @SubscribeMessage('createRoom')
  async createRoom(
    @ConnectedSocket() client: Socket
  ): Promise<any> {
    this.Logger('createRoom');

    // create a new room and get room key
    const roomKey = await this.roomService.createRoom(client.handshake.auth.id);
    console.log(roomKey);
    // join client socket to the room
    client.join(`room-${roomKey}`);

    this.logger.log(`client: ${client.id} join room: room-${roomKey}`);
    return {
      code: SUCCESSFUL,
      message: 'createRoom successfully',
      data: {roomKey: roomKey}
    }
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomKey: string
  ): Promise<any> {
    this.Logger('joinRoom', roomKey);

    const joinRoomData = await this.roomService.joinRoom(
      client.handshake.auth.id,
      roomKey
    )

    if (joinRoomData.code) return joinRoomData;

    this.logger.log(`client: ${client.id} join room: room-${roomKey}`);

    if (roomKey) await client.join(`room-${roomKey}`);
    return joinRoomData;
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
  ): Promise<any> {
    this.Logger('leaveRoom');

    client.rooms.forEach((e) => {
      if (e.includes('room')) {
        const roomKey = e.replace('room-', '');
        this.roomService.leaveRoom(client.handshake.auth.id, roomKey);
        client.leave(e);
        this.server.to(e).emit('user-leave-room', '');
      }
    });
  }
}
