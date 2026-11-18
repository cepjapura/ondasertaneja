-- AlterTable
ALTER TABLE `OfficialChannel` ADD COLUMN `subscriberCount` VARCHAR(191) NULL, ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `WeeklyPlaylist` ADD COLUMN `windowDays` INTEGER NOT NULL DEFAULT 14;
