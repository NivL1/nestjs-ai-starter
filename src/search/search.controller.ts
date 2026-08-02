import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentResponseDto } from './dto/document-response.dto';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { SearchService } from './search.service';

@ApiBearerAuth()
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  ingest(@Body() dto: IngestDocumentDto): Promise<DocumentResponseDto> {
    return this.searchService.ingest(dto.content, dto.metadata);
  }

  @Get()
  search(@Query() dto: SearchQueryDto): Promise<SearchResultDto[]> {
    return this.searchService.search(dto.q, dto.limit);
  }
}
