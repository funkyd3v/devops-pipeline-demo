import { IsNotEmpty, IsString } from 'class-validator';

export class CreateItemDto {
  // Rejected with 400 by the global ValidationPipe when missing or empty.
  @IsString()
  @IsNotEmpty()
  name: string;
}
