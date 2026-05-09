// =================================================================================
// LOGIN DTO (The Authentication Schema)
// =================================================================================
// This DTO defines the credential payload for session requests.
// It ensures that authentication requests provide the necessary
// identity markers for verification.
// =================================================================================

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  // 1. [VALIDATION] Require username for lookup
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  // 2. [VALIDATION] Require password for verification
  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
