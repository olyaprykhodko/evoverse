import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export interface SpinResult {
  winningNumber: number;
  serverSeed: string;
  serverHash: string;
  roundNonce: number;
  totalBets: number;
}

@WebSocketGateway({ namespace: '/roulette', cors: { origin: '*' } })
export class RouletteGateway {
  @WebSocketServer()
  server: Server;

  broadcastResult(result: SpinResult): void {
    this.server.emit('table:result', result);
  }

  broadcastCountdown(expiresIn: number): void {
    this.server.emit('table:countdown', { expiresIn });
  }
}
