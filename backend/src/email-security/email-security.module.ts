import { Module, Global } from '@nestjs/common';
import { EmailSecurityService } from './email-security.service';

@Global()
@Module({
  providers: [EmailSecurityService],
  exports: [EmailSecurityService],
})
export class EmailSecurityModule {}
