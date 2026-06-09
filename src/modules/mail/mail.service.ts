import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY || '');

  async sendVerificationEmail(to: string, link: string): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: process.env.MAIL_FROM!,
      to,
      subject: 'Verify your email · GlowVerse',
      html: this.verificationHtml(link),
    });

    if (error) {
      this.logger.error(`Resend failed for ${to}: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
    this.logger.log(`Verification email sent to ${to} (id: ${data?.id})`);
  }

  private verificationHtml(link: string): string {
    return `
  <div style="background:#030303;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#0a0a0a;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:36px 32px 8px;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#00ff87;text-transform:uppercase;">GlowVerse</div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:3px;text-transform:uppercase;margin-top:6px;">Gaming Platform</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 8px;">
          <h1 style="color:#f5f5f5;font-size:20px;margin:0 0 12px;">Confirm your email</h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 28px;">
            Thanks for registering for an account on Glowverse. Before we get started, we need you to confirm your email address by clicking the link below. This link is valid for <strong style="color:#cbd5e1;">24 hours</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>
              <td style="border-radius:10px;background:#00ff87;">
                <a href="${link}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#030303;text-decoration:none;border-radius:10px;">Verify Email</a>
              </td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
            If the button doesn't work, paste this link into your browser:<br/>
            <a href="${link}" style="color:#00ff87;word-break:break-all;">${link}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #1e1e1e;text-align:center;">
          <p style="color:#4b5563;font-size:11px;line-height:1.6;margin:0;">
            If you didn't sign up for GlowVerse, you can ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
  }
}
