import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { ROOM_NOT_FOUND, SUCCESSFUL } from 'src/returnCode';

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
    @ConnectedSocket() client: Socket,
    @MessageBody() is_elo: boolean,
  ): Promise<any> {
    this.Logger('createRoom', is_elo);

    // create a new room and get room key
    const roomKey = await this.roomService.createRoom(client.handshake.auth.id, is_elo);
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
    
    if (response.code === 1) {
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
    
    client.rooms.forEach(async (e) => {
      if (e.includes('room')) {
        const roomKey = e.replace('room-', '');
        this.Logger('leaveRoom');
        var response = await this.roomService.leaveRoom(client.handshake.auth.id, roomKey);
        if (response.code === 1) {
          this.server.to(e).emit('endOfMatch', {
            code: SUCCESSFUL,
            message: 'Match has ended',
            data: response.data,
          });
        }
        
        client.leave(e);
        this.server.to(e).emit('user-leave-room', {
          code: SUCCESSFUL,
          message: `User ${response.index} left room`,
          data: {
            userCode: response.index,
          }
        });
      }
    });

    return {
      code: SUCCESSFUL,
      message: "Leave room successfully",
      data: {},
    }
  }

  @SubscribeMessage('userEndSet')
  async userEndSet(
    @MessageBody() message: string,
  ): Promise<any> {
    const data = JSON.parse(message);
    var roomKey = data.roomKey;
    var userCode = data.userCode;
    var setCode = data.setCode;

    this.Logger('userEndSet', JSON.stringify({
      'roomKey': roomKey,
      'userCode': userCode,
      'setCode': setCode,
    }));
    var response = await this.roomService.userEndSet(roomKey, userCode, setCode);

    // all player has ended their playing session...
    if (response.code === 1) {
      this.server.to(`room-${roomKey}`).emit('endOfSet', {
        code: SUCCESSFUL,
        message: 'Set has ended',
        data: response.data,
      });
    }

    return {
      code: SUCCESSFUL,
      message: "End set successfully",
      data: {},
    }
  }

  @SubscribeMessage('userStartSet')
  async userStartSet(
    @MessageBody() message: string,
  ) {
    const data = JSON.parse(message);
    var roomKey = data.roomKey;
    var userCode = data.userCode;

    this.Logger('userStartSet', JSON.stringify({
      'roomKey': roomKey,
      'userCode': userCode,
    }));
    var response = await this.roomService.userStartSet(roomKey, userCode);

    // all player has ended their playing session...
    if (response.code === 1) {
      this.server.to(`room-${roomKey}`).emit('startOfSet', {
        code: SUCCESSFUL,
        message: 'Start the set',
        data: response.data,
      });
    }

    return {
      code: SUCCESSFUL,
      message: "Start set successfully",
      data: {},
    }
  }

  @SubscribeMessage('userSubmit')
  async userSubmit(
    @MessageBody() message: string,
  ) {
    const data = JSON.parse(message);
    var roomKey = data.roomKey;
    var userCode = data.userCode;
    var setCode = data.setCode;
    var addedPoint = data.addedPoint;

    this.Logger('userSubmit', JSON.stringify({
      'roomKey': roomKey,
      'userCode': userCode,
      'setCode': setCode,
      'addedPoint': addedPoint,
    }));
    var response = await this.roomService.userSubmit(roomKey, userCode, setCode, addedPoint);

    if (response.code === 1) {
      this.server.to(`room-${roomKey}`).emit('userAnswer', {
        code: SUCCESSFUL,
        message: 'Submit answer successfully',
        data: response.data,
      });
    }

    return {
      code: SUCCESSFUL,
      message: "Submit successfully",
      data: {},
    }
  }

  @SubscribeMessage('displayScore')
  async displayScore(
    @MessageBody() roomKey: string
  ) {
    this.Logger('displayScore', roomKey);
    var getGameResult = await this.roomService.getGameResult(roomKey);
    if (getGameResult.code === 1) {
      this.server.to(`room-${roomKey}`).emit('endOfMatch', {
        code: SUCCESSFUL,
        message: 'Match has ended',
        data: getGameResult.data,
      });
    }
    
    var response = await this.roomService.displayScore(roomKey);
    if (response.code === 1) {
      return {
        code: SUCCESSFUL,
        message: 'return score successfully',
        data: response.data,
      }
    } else {
      return {
        code: ROOM_NOT_FOUND,
        message: 'room not found',
        data: {},
      }
    }
  }
}
