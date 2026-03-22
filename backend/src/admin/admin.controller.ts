import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthService } from '../auth/auth.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminUpdateUserDto, UpdateRoleDto, PaginationDto, CreateAdminDto } from './dto';

/**
 * Controller Admin - Routes protégées pour la gestion des utilisateurs
 * Toutes les routes nécessitent le rôle ADMIN
 */
@Controller('admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  /**
   * GET /admin/users - Liste tous les utilisateurs avec pagination
   * 
   * Query params:
   * - page: numéro de page (défaut: 1)
   * - limit: nombre d'éléments par page (défaut: 20, max: 100)
   * - search: recherche par email/nom
   * - role: filtrer par rôle (USER | ADMIN)
   * - sortBy: champ de tri (createdAt, email, firstName, lastName)
   * - sortOrder: ordre de tri (ASC | DESC)
   */
  @Get('users')
  findAllUsers(@Query() query: PaginationDto) {
    return this.adminService.findAllUsers(query);
  }

  /**
   * POST /admin/users - Créer un nouvel utilisateur (admin peut créer des admins)
   */
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() dto: CreateAdminDto) {
    return this.adminService.createUser(dto);
  }

  /**
   * GET /admin/stats - Statistiques du dashboard admin
   */
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  /**
   * GET /admin/users/:id - Détails d'un utilisateur
   */
  @Get('users/:id')
  findUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findUserById(id);
  }

  /**
   * PATCH /admin/users/:id - Mettre à jour un utilisateur
   */
  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  /**
   * DELETE /admin/users/:id - Supprimer un utilisateur
   */
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.adminService.removeUser(id, req.user.id);
  }

  /**
   * PATCH /admin/users/:id/role - Modifier le rôle d'un utilisateur
   */
  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserRole(id, dto, req.user.id);
  }

  /* ===== BIOMETRIC / EMPREINTE ADMIN ===== */

  /**
   * POST /admin/biometric/register/options - Générer les options WebAuthn pour enregistrement empreinte
   * L'admin connecté peut enregistrer son empreinte pour accès rapide au dashboard
   */
  @Post('biometric/register/options')
  @HttpCode(HttpStatus.OK)
  async biometricRegisterOptions(@Req() req: any) {
    return this.authService.generateAdminBiometricRegistrationOptions(req.user);
  }

  /**
   * POST /admin/biometric/register/verify - Vérifier et sauvegarder l'empreinte admin
   */
  @Post('biometric/register/verify')
  @HttpCode(HttpStatus.OK)
  async biometricRegisterVerify(@Req() req: any, @Body('credential') credential: any) {
    return this.authService.verifyAdminBiometricRegistration(req.user, credential);
  }

  /**
   * DELETE /admin/biometric - Supprimer l'empreinte de l'admin connecté
   */
  @Delete('biometric')
  @HttpCode(HttpStatus.OK)
  async removeBiometric(@Req() req: any) {
    return this.authService.removeAdminBiometric(req.user);
  }

  /**
   * GET /admin/biometric/status - Vérifier si l'admin a une empreinte enregistrée
   */
  @Get('biometric/status')
  @HttpCode(HttpStatus.OK)
  async biometricStatus(@Req() req: any) {
    return {
      hasBiometric: !!req.user.webauthnCredentialID,
    };
  }
}
