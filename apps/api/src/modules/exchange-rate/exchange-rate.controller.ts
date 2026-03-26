import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import { Currency } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExchangeRateService } from './exchange-rate.service';
import { ConvertAmountDto, CURRENCY_INFO } from './dto/exchange-rate.dto';

/**
 * 匯率 API 控制器
 */
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * 取得所有支援的貨幣
   * GET /exchange-rates/currencies
   */
  @Get('currencies')
  getSupportedCurrencies() {
    return this.exchangeRateService.getSupportedCurrencies();
  }

  /**
   * 取得所有匯率（以指定貨幣為基準）
   * GET /exchange-rates?base=TWD
   */
  @Get()
  async getAllRates() {
    return this.exchangeRateService.getAllRates(Currency.TWD);
  }

  /**
   * 取得特定匯率
   * GET /exchange-rates/:base/:target
   */
  @Get(':base/:target')
  async getRate(
    @Param('base', new ParseEnumPipe(Currency)) base: Currency,
    @Param('target', new ParseEnumPipe(Currency)) target: Currency,
  ) {
    return this.exchangeRateService.getRate(base, target);
  }

  /**
   * 轉換金額
   * POST /exchange-rates/convert
   */
  @Post('convert')
  async convertAmount(@Body() dto: ConvertAmountDto) {
    return this.exchangeRateService.convert(dto.amount, dto.from, dto.to);
  }

  /**
   * 取得貨幣資訊
   * GET /exchange-rates/currency/:code
   */
  @Get('currency/:code')
  getCurrencyInfo(@Param('code', new ParseEnumPipe(Currency)) code: Currency) {
    return CURRENCY_INFO[code];
  }
}
