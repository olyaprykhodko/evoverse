import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { JwtPayload } from '../auth/strategies/jwt-access.strategy.js';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiGoneResponse,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'Created – user successfully registered' })
  @ApiConflictResponse({ description: 'Conflict – email already exists' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get own full profile' })
  @ApiOkResponse({ description: 'OK – profile with balance, address' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found – user deleted or not found' })
  @UseGuards(JwtAccessGuard)
  @Get('me')
  findMe(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.usersService.findMe(user.sub);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get public profile by user ID' })
  @ApiOkResponse({ description: 'OK – username, rating, level, country' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found – user deleted or not found' })
  @UseGuards(JwtAccessGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update own account (username / email / password)' })
  @ApiOkResponse({ description: 'OK – user updated' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiConflictResponse({ description: 'Conflict – email already taken' })
  @ApiGoneResponse({ description: 'Gone – account has been deleted' })
  @UseGuards(JwtAccessGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Soft-delete own account' })
  @ApiOkResponse({ description: 'OK – account archived' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiGoneResponse({ description: 'Gone – account already deleted' })
  @UseGuards(JwtAccessGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
