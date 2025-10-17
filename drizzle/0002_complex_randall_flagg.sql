ALTER TABLE `summaries` ADD `jotsNotesCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `summaries` DROP COLUMN `shortformNotesCount`;