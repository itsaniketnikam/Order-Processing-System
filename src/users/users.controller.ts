import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return UserResponseDto.fromEntity(user);
  }
}
