import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

const BCRYPT_SALT_ROUNDS = 10;
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Creates a new user with a bcrypt-hashed password.
   * Throws ConflictException if the email is already registered.
   * Returns the user WITHOUT the password column populated.
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Email "${normalizedEmail}" is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = this.usersRepository.create({
      email: normalizedEmail,
      password: passwordHash,
    });

    try {
      const saved = await this.usersRepository.save(user);
      this.logger.log(`User created id=${saved.id}`);
      return this.stripPassword(saved);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Email "${normalizedEmail}" is already registered`);
      }
      this.logger.error('Failed to persist user', err as Error);
      throw new InternalServerErrorException('Could not create user');
    }
  }

  /**
   * Lookup by id (PUBLIC view - password excluded).
   * Throws NotFoundException if the user does not exist.
   */
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  /**
   * Lookup by email for the auth flow.
   * `includePassword` opts into selecting the password column for credential
   * verification. Returns `null` on miss so callers can throw the appropriate
   * domain error (e.g. "invalid credentials") without leaking which side
   * actually failed.
   */
  async findByEmail(
    email: string,
    options: { includePassword?: boolean } = {},
  ): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    const qb = this.usersRepository.createQueryBuilder('user').where('user.email = :email', {
      email: normalized,
    });
    if (options.includePassword) {
      qb.addSelect('user.password');
    }
    return qb.getOne();
  }

  private stripPassword(user: User): User {
    const clone: User = { ...user };
    delete (clone as Partial<User>).password;
    return clone;
  }
}
