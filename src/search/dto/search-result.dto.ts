import { ApiProperty } from '@nestjs/swagger';
import { DocumentResponseDto } from './document-response.dto';

export class SearchResultDto extends DocumentResponseDto {
  @ApiProperty({ description: 'Cosine distance to the query vector — lower is more similar.' })
  distance!: number;
}
