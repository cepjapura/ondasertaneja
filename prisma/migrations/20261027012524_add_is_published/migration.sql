-- AlterTable
ALTER TABLE `ChartEntry` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Event` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Music` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `News` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `ChartEntry_isPublished_period_position_idx` ON `ChartEntry`(`isPublished`, `period`, `position`);

-- CreateIndex
CREATE INDEX `Event_isPublished_eventDate_idx` ON `Event`(`isPublished`, `eventDate`);

-- CreateIndex
CREATE INDEX `Music_isPublished_createdAt_idx` ON `Music`(`isPublished`, `createdAt`);

-- CreateIndex
CREATE INDEX `Music_isPublished_isHit_idx` ON `Music`(`isPublished`, `isHit`);

-- CreateIndex
CREATE INDEX `News_isPublished_publishedAt_idx` ON `News`(`isPublished`, `publishedAt`);
