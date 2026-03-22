import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Body, Patch, Delete  } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
@UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/ping')
  adminPing() {
    return { ok: true, message: 'Admin only' };
  }
  @UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
@Get()
getAllUsers() {
  return this.usersService.findAll();
}
  @UseGuards(JwtAccessGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }
  @UseGuards(JwtAccessGuard)
@Patch('me')
updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
  return this.usersService.update(req.user.id, dto);
}
 @UseGuards(JwtAccessGuard)
  @Delete('me')
  deleteMe(@Req() req: any) {
    return this.usersService.remove(req.user.id);
  }
}