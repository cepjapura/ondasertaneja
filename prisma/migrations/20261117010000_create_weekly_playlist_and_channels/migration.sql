-- CreateTable
CREATE TABLE `OfficialChannel` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `channelTitle` VARCHAR(191) NOT NULL,
    `channelUrl` VARCHAR(1024) NOT NULL,
    `avatarUrl` VARCHAR(2048) NULL,
    `uploadsPlaylistId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OfficialChannel_channelId_key`(`channelId`),
    INDEX `OfficialChannel_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyPlaylist` (
    `id` VARCHAR(191) NOT NULL,
    `weekIdentifier` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Lançamentos da Semana',
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `mode` VARCHAR(191) NOT NULL DEFAULT 'MANUAL_REVIEW',
    `autoPublishAt` DATETIME(3) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,

    UNIQUE INDEX `WeeklyPlaylist_weekIdentifier_key`(`weekIdentifier`),
    INDEX `WeeklyPlaylist_status_idx`(`status`),
    INDEX `WeeklyPlaylist_weekIdentifier_idx`(`weekIdentifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyPlaylistItem` (
    `id` VARCHAR(191) NOT NULL,
    `playlistId` VARCHAR(191) NOT NULL,
    `youtubeVideoId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `channelTitle` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(2048) NULL,
    `durationSeconds` INTEGER NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isRemoved` BOOLEAN NOT NULL DEFAULT false,

    INDEX `WeeklyPlaylistItem_playlistId_isRemoved_sortOrder_idx`(`playlistId`, `isRemoved`, `sortOrder`),
    INDEX `WeeklyPlaylistItem_youtubeVideoId_idx`(`youtubeVideoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlaylistSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL DEFAULT 'CRON',
    `weekIdentifier` VARCHAR(191) NULL,
    `videosFound` INTEGER NOT NULL DEFAULT 0,
    `videosSelected` INTEGER NOT NULL DEFAULT 0,
    `message` TEXT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlaylistSyncLog_executedAt_idx`(`executedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WeeklyPlaylistItem` ADD CONSTRAINT `WeeklyPlaylistItem_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `WeeklyPlaylist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
