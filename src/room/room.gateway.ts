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
    var response = await this.roomService.checkStartGame(roomKey);
    
    if (response.code == 1) {
      this.server.to(`room-${roomKey}`).emit('startGame', {
        code: SUCCESSFUL,
        message: 'Start the match',
        data: response.data,
      });
    }

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

  @SubscribeMessage('userEndSet')
  async userEndSet(
    @MessageBody() roomKey: string,
    @MessageBody() userCode: number,
  ): Promise<any> {
    this.Logger('userEndSet');

    var response = await this.roomService.userEndSet(roomKey, userCode);

    // all player has ended their playing session...
    if (response.code == 1) {
      this.server.to(`room-${roomKey}`).emit('endOfSet', {
        code: SUCCESSFUL,
        message: 'Set has ended',
        data: response.data,
      });

      var getResultAfterSet = await this.roomService.getResultAfterSet(roomKey);
      this.server.to(`room-${roomKey}`).emit('endOfGame', {
        code: SUCCESSFUL,
        message: 'Game has ended',
        data: getResultAfterSet.data,
      });
    }
  }

  @SubscribeMessage('userStartSet')
  async userStartSet(
    @MessageBody() roomKey: string,
    @MessageBody() userCode: number,
  ) {
    this.Logger('userStartSet');

    var response = await this.roomService.userStartSet(roomKey, userCode);

    // all player has ended their playing session...
    if (response.code == 1) {
      this.server.to(`room-${roomKey}`).emit('startOfSet', {
        code: SUCCESSFUL,
        message: 'Start the set',
        data: response.data,
      });
    }
  }

  @SubscribeMessage('userSubmit')
  async userSubmit(
    @MessageBody() roomKey: string,
    @MessageBody() userCode: number,
    @MessageBody() setCode: number,
    @MessageBody() addedPoint: number,
  ) {
    this.Logger('userSubmit');

    var response = await this.roomService.userSubmit(roomKey, userCode, setCode, addedPoint);

    if (response.code == 1) {
      this.server.to(`room-${roomKey}`).emit('userAnswer', {
        code: SUCCESSFUL,
        message: 'Submit answer successfully',
        data: response.data,
      });
    }
  }
}
