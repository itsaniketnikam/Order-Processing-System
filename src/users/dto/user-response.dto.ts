import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../entities/user.entity';

/**
 * Outbound representation of a User. Constructed explicitly from the entity
 * so the password column can never leak into HTTP responses, even if the
 * caller forgets to apply ClassSerializerInterceptor.
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({
    example: '6f8e3b3a-4a8a-4f1d-9b7e-1c5e3d8e2f4a',
    format: 'uuid',
  })
  id!: string;

  @Expose()
  @ApiProperty({ example: 'jane.doe@example.com' })
  email!: string;

  @Expose()
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @Expose()
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
