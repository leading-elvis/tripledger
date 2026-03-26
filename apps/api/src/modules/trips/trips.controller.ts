import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateTripDto,
  UpdateTripDto,
  JoinTripDto,
  UpdateMemberNicknameDto,
  UpdateMemberRoleDto,
  CreateVirtualMemberDto,
  UpdateVirtualMemberDto,
} from './dto/trip.dto';

@ApiTags('trips')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @ApiOperation({ summary: '建立新旅程' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTripDto,
  ) {
    return this.tripsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '取得用戶所有旅程' })
  async findAll(@CurrentUser() user: { id: string }) {
    return this.tripsService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得旅程詳情' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tripsService.findById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新旅程' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除旅程' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tripsService.delete(id, user.id);
    return { message: '旅程已刪除' };
  }

  @Post('join')
  @ApiOperation({ summary: '透過邀請碼加入旅程' })
  async join(
    @CurrentUser() user: { id: string },
    @Body() dto: JoinTripDto,
  ) {
    return this.tripsService.joinByInviteCode(dto.inviteCode, user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '取得旅程成員' })
  async getMembers(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tripsService.getMembers(id, user.id);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: '移除旅程成員' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tripsService.removeMember(id, memberId, user.id);
    return { message: '成員已移除' };
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '離開旅程' })
  async leave(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tripsService.leave(id, user.id);
    return { message: '已離開旅程' };
  }

  @Post(':id/regenerate-invite')
  @ApiOperation({ summary: '重新產生邀請碼' })
  async regenerateInviteCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tripsService.regenerateInviteCode(id, user.id);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: '更新成員暱稱' })
  async updateMemberNickname(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberNicknameDto,
  ) {
    return this.tripsService.updateMemberNickname(id, memberId, user.id, dto.nickname);
  }

  @Put(':id/members/:memberId/role')
  @ApiOperation({ summary: '更新成員角色' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.tripsService.updateMemberRole(id, memberId, user.id, dto.role);
  }

  // ============================================
  // 虛擬人員端點
  // ============================================

  @Post(':id/virtual-members')
  @ApiOperation({ summary: '建立虛擬人員' })
  async createVirtualMember(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVirtualMemberDto,
  ) {
    return this.tripsService.createVirtualMember(id, user.id, dto.name);
  }

  @Get(':id/virtual-members')
  @ApiOperation({ summary: '取得虛擬人員列表' })
  async getVirtualMembers(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tripsService.getVirtualMembers(id, user.id);
  }

  @Put(':id/virtual-members/:vmId')
  @ApiOperation({ summary: '更新虛擬人員名稱' })
  async updateVirtualMember(
    @Param('id') id: string,
    @Param('vmId') vmId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateVirtualMemberDto,
  ) {
    return this.tripsService.updateVirtualMember(id, vmId, user.id, dto.name);
  }

  @Delete(':id/virtual-members/:vmId')
  @ApiOperation({ summary: '刪除虛擬人員' })
  async deleteVirtualMember(
    @Param('id') id: string,
    @Param('vmId') vmId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tripsService.deleteVirtualMember(id, vmId, user.id);
    return { message: '虛擬人員已刪除' };
  }

  @Post(':id/virtual-members/:vmId/merge')
  @ApiOperation({ summary: '合併虛擬人員到當前用戶' })
  async mergeVirtualMember(
    @Param('id') id: string,
    @Param('vmId') vmId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tripsService.mergeVirtualMember(id, vmId, user.id);
  }
}
