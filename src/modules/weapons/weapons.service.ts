import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CoinTransactionType } from '../../../generated/prisma/enums.js';
import { sendResponse } from '../../common/utils/response.js';
import { WalletService } from '../wallet/wallet.service.js';
import { BuyWeaponDto } from './dto/buy-weapon.dto.js';

@Injectable()
export class WeaponsService {
  private readonly logger = new Logger(WeaponsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async listWeapons() {
    const weapons = await this.prisma.weapon.findMany({
      orderBy: [{ rarity: 'asc' }, { price: 'asc' }],
      select: {
        id: true,
        name: true,
        price: true,
        minDamage: true,
        maxDamage: true,
        rarity: true,
      },
    });

    return sendResponse('Weapons fetched', 200, weapons);
  }

  async getInventory(userId: number) {
    const inventory = await this.prisma.userWeapon.findMany({
      where: { userId },
      orderBy: { boughtAt: 'desc' },
      select: {
        id: true,
        boughtAt: true,
        weapon: {
          select: {
            id: true,
            name: true,
            price: true,
            minDamage: true,
            maxDamage: true,
            rarity: true,
          },
        },
      },
    });

    return sendResponse('Inventory fetched', 200, inventory);
  }

  async buyWeapon(userId: number, dto: BuyWeaponDto) {
    const weapon = await this.prisma.weapon.findUnique({
      where: { id: dto.weaponId },
    });

    if (!weapon) throw new NotFoundException('Weapon not found');

    const alreadyOwned = await this.prisma.userWeapon.findUnique({
      where: { userId_weaponId: { userId, weaponId: dto.weaponId } },
    });

    if (alreadyOwned) throw new ConflictException('Weapon already owned');

    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, coins: true },
    });

    if (!userWallet) throw new NotFoundException('Wallet not found');

    if (userWallet.coins < weapon.price) {
      throw new BadRequestException(
        `Insufficient coins. Need ${weapon.price}, have ${userWallet.coins}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.walletService.processCoinTransaction(
        tx,
        userWallet.id,
        CoinTransactionType.SPENT_WEAPON,
        weapon.price,
        String(weapon.id),
        `Bought weapon: ${weapon.name}`,
      );

      await tx.userWeapon.create({
        data: { userId, weaponId: dto.weaponId },
      });
    });

    return sendResponse('Weapon purchased', 201, {
      weaponId: weapon.id,
      weaponName: weapon.name,
      coinsSpent: weapon.price,
    });
  }
}
