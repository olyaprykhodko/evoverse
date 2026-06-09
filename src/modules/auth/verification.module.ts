import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [MailModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
