import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { ChatService } from './chat.service.js';
import { ChatGateway } from './chat.gateway.js';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
