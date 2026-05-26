import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'jane.doe@example.com',
    description: 'Unique customer email address',
    maxLength: 255,
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
    description: 'User password',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'password must be at least 8 characters long',
  })
  @MaxLength(72, {
    message: 'password cannot exceed 72 characters',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'password must contain uppercase, lowercase and number',
  })
  password!: string;

  @ApiProperty({
    example: 'Jane',
    description: 'Customer first name',
    maxLength: 100,
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'firstName contains invalid characters',
  })
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Customer last name',
    maxLength: 100,
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'lastName contains invalid characters',
  })
  lastName!: string;
}
