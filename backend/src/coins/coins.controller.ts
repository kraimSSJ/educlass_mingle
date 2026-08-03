import { Body, Controller, Post } from '@nestjs/common';
import { CoinsService } from './coins.service';

@Controller('coins')
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  @Post('earn')
  earn(@Body() body: { userId: string; amount: number; reason: 'studying' | 'staying_in_app' }) {
    return this.coinsService.earn(body.userId, body.amount, body.reason);
  }

  @Post('spend')
  spend(@Body() body: { userId: string; amount: number }) {
    return this.coinsService.spend(body.userId, body.amount);
  }
}
