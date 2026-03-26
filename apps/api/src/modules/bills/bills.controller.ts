import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBillDto, UpdateBillDto } from './dto/bill.dto';
import { S3Service } from '../../common/s3/s3.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('bills')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillsController {
  constructor(
    private readonly billsService: BillsService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('trips/:tripId/bills')
  @ApiOperation({ summary: '新增帳單' })
  @UseInterceptors(FileInterceptor('receiptImage', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
        cb(new BadRequestException('只支援 JPEG、PNG、GIF、WebP 圖片格式'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  @ApiConsumes('multipart/form-data', 'application/json')
  async create(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBillDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let receiptImageUrl: string | undefined = dto.receiptImage;

    // 如果有上傳檔案且 S3 已設定，上傳到 S3
    if (file) {
      const uploadedUrl = await this.s3Service.uploadFile(file, 'receipts');
      if (uploadedUrl) {
        receiptImageUrl = uploadedUrl;
      }
    }

    return this.billsService.create(user.id, {
      ...dto,
      tripId,
      receiptImage: receiptImageUrl,
    });
  }

  @Get('trips/:tripId/bills')
  @ApiOperation({ summary: '取得旅程所有帳單' })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設 20，最大 100)' })
  @ApiQuery({ name: 'offset', required: false, description: '跳過筆數 (預設 0)' })
  async findAllByTrip(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.billsService.findAllByTrip(tripId, user.id, pagination);
  }

  @Get('trips/:tripId/bills/stats')
  @ApiOperation({ summary: '取得帳單統計（依分類）' })
  async getStats(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.billsService.getStatsByCategory(tripId, user.id);
  }

  @Get('bills/:id')
  @ApiOperation({ summary: '取得帳單詳情' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.billsService.findById(id, user.id);
  }

  @Put('bills/:id')
  @ApiOperation({ summary: '更新帳單' })
  @UseInterceptors(FileInterceptor('receiptImage', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
        cb(new BadRequestException('只支援 JPEG、PNG、GIF、WebP 圖片格式'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  @ApiConsumes('multipart/form-data', 'application/json')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateBillDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let receiptImageUrl: string | undefined = dto.receiptImage;

    // 如果有上傳新檔案且 S3 已設定，上傳到 S3
    if (file) {
      const uploadedUrl = await this.s3Service.uploadFile(file, 'receipts');
      if (uploadedUrl) {
        receiptImageUrl = uploadedUrl;
      }
    }

    return this.billsService.update(id, user.id, {
      ...dto,
      receiptImage: receiptImageUrl,
    });
  }

  @Delete('bills/:id')
  @ApiOperation({ summary: '刪除帳單' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.billsService.delete(id, user.id);
    return { message: '帳單已刪除' };
  }
}
