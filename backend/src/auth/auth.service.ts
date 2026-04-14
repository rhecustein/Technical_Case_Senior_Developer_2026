import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUser();
  }

  /**
   * Validate credentials and return a signed JWT access token.
   * Throws UnauthorizedException for any credential mismatch (username or password).
   * Intentionally uses the same error message for both cases to prevent user enumeration.
   */
  async login(dto: LoginDto): Promise<{ access_token: string; user: { id: string; username: string } }> {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user.id, username: user.username },
    };
  }

  private async seedAdminUser(): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { username: 'admin' },
    });
    if (!existing) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await this.userRepository.save({
        username: 'admin',
        passwordHash,
      });
      this.logger.log('Admin user seeded');
    }
  }
}
