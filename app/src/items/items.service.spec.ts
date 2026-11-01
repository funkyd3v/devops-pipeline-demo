import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;

  beforeEach(() => {
    service = new ItemsService();
  });

  it('starts with no items', () => {
    expect(service.findAll()).toEqual([]);
  });

  it('creates an item with an auto-incremented id', () => {
    expect(service.create('first')).toEqual({ id: 1, name: 'first' });
    expect(service.create('second')).toEqual({ id: 2, name: 'second' });
  });

  it('returns all created items in insertion order', () => {
    service.create('first');
    service.create('second');

    expect(service.findAll()).toEqual([
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ]);
  });
});
