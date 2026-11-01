import { Injectable } from '@nestjs/common';
import { Item } from './item.interface';

@Injectable()
export class ItemsService {
  // In-memory only: data is lost on restart. A database is out of scope here.
  private readonly items: Item[] = [];
  private nextId = 1;

  findAll(): Item[] {
    return this.items;
  }

  create(name: string): Item {
    const item: Item = { id: this.nextId++, name };
    this.items.push(item);
    return item;
  }
}
