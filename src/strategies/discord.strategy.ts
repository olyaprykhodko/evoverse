import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  DiscordScope,
  type DiscordProfile as RawDiscordProfile,
  type VerifyCallback,
} from 'discord-strategy';

import { DiscordProfile } from '../common/types/discord.js';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor() {
    super({
      authorizationURL: 'https://discord.com/api/oauth2/authorize',
      tokenURL: 'https://discord.com/api/oauth2/token',
      clientID: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      callbackURL: process.env.DISCORD_CALLBACK_URL ?? '',
      scope: [DiscordScope.Identify, DiscordScope.Email],
    });

    (
      this as unknown as {
        _verify: (
          accessToken: string,
          refreshToken: string,
          profile: RawDiscordProfile,
          verified: VerifyCallback,
        ) => void;
      }
    )._verify = (_accessToken, _refreshToken, profile, verified) => {
      verified(null, this.validate(profile));
    };
  }

  validate(profile: RawDiscordProfile): DiscordProfile {
    return {
      discordId: profile.id,
      email: profile.email ?? '',
      displayName: profile.global_name ?? profile.username,
      avatar:
        profile.avatarUrl ??
        (profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : undefined),
    };
  }
}
