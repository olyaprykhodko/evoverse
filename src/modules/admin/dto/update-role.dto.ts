import { IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../../generated/prisma/enums.js';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({
    description: 'Required when changing user/admin role',
  })
  @IsString()
  adminSecret: string;
}
