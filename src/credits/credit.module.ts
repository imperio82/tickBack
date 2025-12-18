import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { CreditPackage } from './entities/credit-package.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { Usuario } from '../user/user.Entity/user.Entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditPackage,
      CreditTransaction,
      Usuario,
    ]),
  ],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService], // Exportar para uso en otros módulos
})
export class CreditModule {}
