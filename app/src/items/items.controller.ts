import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import type { Item } from './item.interface';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(): Item[] {
    return this.itemsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateItemDto): Item {
    return this.itemsService.create(dto.name);
  }
}
