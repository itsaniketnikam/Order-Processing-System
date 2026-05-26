import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  /**
   * Login intentionally does NOT enforce a min length; legacy users may have
   * shorter passwords than the current registration policy, and we don't want
   * to leak the policy through the login form.
   */
  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}
