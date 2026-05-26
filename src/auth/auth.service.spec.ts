import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt');

// bcrypt.compare has overlapping callback + promise overloads; downcasting to
// jest.Mock sidesteps the union so we can use the simple resolve/reject API.
const bcryptCompare = bcrypt.compare as unknown as jest.Mock;

const SAMPLE_USER: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'jane.doe@example.com',
  password: 'hashed-secret',
  firstName: 'Jane',
  lastName: 'Doe',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'createUser' | 'findByEmail'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn(),
      findByEmail: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    bcryptCompare.mockReset();
  });

  // -----------------------------------------------------------------------
  // register
  // -----------------------------------------------------------------------
  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'jane.doe@example.com',
      password: 'StrongP@ssw0rd',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('creates the user and returns a signed access token + user dto', async () => {
      usersService.createUser.mockResolvedValue(SAMPLE_USER);

      const result = await service.register(registerDto);

      expect(usersService.createUser).toHaveBeenCalledWith(registerDto);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: SAMPLE_USER.id,
        email: SAMPLE_USER.email,
      });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toMatchObject({
        id: SAMPLE_USER.id,
        email: SAMPLE_USER.email,
        firstName: 'Jane',
        lastName: 'Doe',
      });
      // Confirm password never leaks into the response DTO.
      expect(
        (result.user as unknown as { password?: string }).password,
      ).toBeUndefined();
    });

    it('propagates ConflictException when the email is already registered', async () => {
      usersService.createUser.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // login
  // -----------------------------------------------------------------------
  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'jane.doe@example.com',
      password: 'StrongP@ssw0rd',
    };

    it('returns a token when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(SAMPLE_USER);
      bcryptCompare.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email, {
        includePassword: true,
      });
      expect(bcryptCompare).toHaveBeenCalledWith(
        loginDto.password,
        SAMPLE_USER.password,
      );
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe(SAMPLE_USER.email);
    });

    it('throws UnauthorizedException when the email is unknown', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptCompare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(SAMPLE_USER);
      bcryptCompare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('uses the same error message for unknown email and wrong password', async () => {
      // First call: unknown email
      usersService.findByEmail.mockResolvedValueOnce(null);
      const errA = await service.login(loginDto).catch((e: Error) => e);

      // Second call: known email, wrong password
      usersService.findByEmail.mockResolvedValueOnce(SAMPLE_USER);
      bcryptCompare.mockResolvedValue(false);
      const errB = await service.login(loginDto).catch((e: Error) => e);

      expect(errA).toBeInstanceOf(UnauthorizedException);
      expect(errB).toBeInstanceOf(UnauthorizedException);
      expect(errA.message).toBe(errB.message);
    });
  });
});
