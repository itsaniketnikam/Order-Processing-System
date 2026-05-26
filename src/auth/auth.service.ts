import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new customer.
   * Delegates uniqueness + hashing to UsersService so password handling lives
   * in exactly one place. Returns an immediately-usable access token so the
   * client doesn't have to do a second round-trip to /auth/login.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.createUser(dto);
    this.logger.log(`Registered user id=${user.id}`);
    return this.issueToken(user);
  }

  /**
   * Login flow:
   *   1. fetch user WITH password column (opt-in via UsersService)
   *   2. bcrypt.compare in constant time
   *   3. on any failure throw the same UnauthorizedException so callers
   *      cannot distinguish "unknown email" from "wrong password"
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email, {
      includePassword: true,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Login id=${user.id}`);
    return this.issueToken(user);
  }

  private issueToken(user: User): AuthResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: UserResponseDto.fromEntity(user),
    };
  }
}
