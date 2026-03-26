import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import {
  NotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('通知')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '取得所有通知' })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設 20，最大 100)' })
  @ApiQuery({ name: 'offset', required: false, description: '跳過筆數 (預設 0)' })
  @ApiResponse({
    status: 200,
    description: '成功取得通知列表',
    type: [NotificationResponseDto],
  })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationsService.findAllByUser(user.id, pagination);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '取得未讀通知數量' })
  @ApiResponse({
    status: 200,
    description: '成功取得未讀數量',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser() user: { id: string },
  ): Promise<UnreadCountResponseDto> {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '標記通知為已讀' })
  @ApiResponse({ status: 204, description: '成功標記為已讀' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.notificationsService.markAsRead(id, user.id);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '標記所有通知為已讀' })
  @ApiResponse({ status: 204, description: '成功標記所有通知為已讀' })
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '刪除通知' })
  @ApiResponse({ status: 204, description: '成功刪除通知' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.notificationsService.delete(id, user.id);
  }
}
