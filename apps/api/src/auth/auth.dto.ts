import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthLoginRequestDto {
  @ApiProperty({ example: 'admin01@musica.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'DELETED'] })
  status: string;

  @ApiProperty({ nullable: true, type: Number })
  roleId: number | null;

  @ApiProperty({ nullable: true })
  roleName: string | null;
}

export class AuthLoginDataDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 604800 })
  expiresInSeconds: number;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
