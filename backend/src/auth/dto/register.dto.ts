// =================================================================================
// REGISTER DTO (The Identity Creation Schema)
// =================================================================================
// This DTO defines the requirements for new user onboarding.
// It enforces strict validation rules on usernames and passwords
// during the registration phase.
// =================================================================================

import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  // 1. [VALIDATION] Require non-empty string for username
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  // 2. [VALIDATION] Enforce minimum security length for passwords
  @ApiProperty({
    example: 'password123',
    description: 'User password (min 8 chars)',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
