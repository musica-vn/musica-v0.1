import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthLoginRequestDto } from './auth.dto';
import { AuthLoginResponseDto } from './auth.swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login bằng email/password' })
  @ApiOkResponse({ type: AuthLoginResponseDto })
  async login(@Body() body: AuthLoginRequestDto) {
    return this.authService.login(body);
  }
}
