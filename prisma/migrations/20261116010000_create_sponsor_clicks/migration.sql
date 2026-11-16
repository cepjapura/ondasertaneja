-- CreateTable
CREATE TABLE `SponsorClick` (
    `id` VARCHAR(191) NOT NULL,
    `sponsorSlug` VARCHAR(191) NOT NULL DEFAULT 'alessandro-mioto',
    `clickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SponsorClick_sponsorSlug_clickedAt_idx`(`sponsorSlug`, `clickedAt`),
    INDEX `SponsorClick_clickedAt_idx`(`clickedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
