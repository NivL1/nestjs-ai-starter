import { DataSource } from 'typeorm';
import { EmbeddingCacheService } from '../embeddings/embedding-cache.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let embeddings: { embed: jest.Mock };
  let dataSource: { query: jest.Mock };
  let service: SearchService;

  beforeEach(() => {
    embeddings = { embed: jest.fn() };
    dataSource = { query: jest.fn() };
    service = new SearchService(
      embeddings as unknown as EmbeddingCacheService,
      dataSource as unknown as DataSource,
    );
  });

  describe('ingest', () => {
    it('embeds the content and inserts a row with the vector cast to ::vector', async () => {
      embeddings.embed.mockResolvedValue([0.1, 0.2, 0.3]);
      const inserted = {
        id: '1',
        content: 'hi',
        metadata: { source: 'test' },
        createdAt: new Date(),
      };
      dataSource.query.mockResolvedValue([inserted]);

      const result = await service.ingest('hi', { source: 'test' });

      expect(embeddings.embed).toHaveBeenCalledWith('hi');
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "documents"'),
        ['hi', JSON.stringify({ source: 'test' }), '[0.1,0.2,0.3]'],
      );
      expect(result).toEqual(inserted);
    });

    it('defaults metadata to an empty object', async () => {
      embeddings.embed.mockResolvedValue([0.1]);
      dataSource.query.mockResolvedValue([{}]);

      await service.ingest('hi');

      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), ['hi', '{}', '[0.1]']);
    });
  });

  describe('search', () => {
    it('embeds the query and orders results by distance up to the limit', async () => {
      embeddings.embed.mockResolvedValue([0.5, 0.6]);
      const rows = [
        { id: '1', distance: 0.1 },
        { id: '2', distance: 0.2 },
      ];
      dataSource.query.mockResolvedValue(rows);

      const result = await service.search('hello', 5);

      expect(embeddings.embed).toHaveBeenCalledWith('hello');
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY'), [
        '[0.5,0.6]',
        5,
      ]);
      expect(result).toEqual(rows);
    });
  });
});
