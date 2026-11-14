-- AlterTable
ALTER TABLE `ShortVideo` ADD COLUMN `section` VARCHAR(191) NOT NULL DEFAULT 'SHORTS';

-- Classificar vídeos existentes:
-- links youtube.com/shorts, TikTok e Instagram Reels -> SHORTS
-- links normais do YouTube (watch?v=, youtu.be) -> TOP_VIDEOS
UPDATE `ShortVideo`
SET `section` = 'TOP_VIDEOS'
WHERE `url` LIKE '%watch?v=%'
   OR `url` LIKE '%watch%'
   OR `url` LIKE '%youtu.be%'
   OR (`platform` = 'youtube' AND `url` NOT LIKE '%/shorts/%');

UPDATE `ShortVideo`
SET `section` = 'SHORTS'
WHERE `url` LIKE '%/shorts/%'
   OR `url` LIKE '%tiktok.com%'
   OR `url` LIKE '%instagram.com%';

-- CreateIndex
CREATE INDEX `ShortVideo_isPublished_section_sortOrder_idx` ON `ShortVideo`(`isPublished`, `section`, `sortOrder`);
