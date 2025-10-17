CREATE TABLE `documents` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`fileType` enum('pdf','docx','txt','rtf') NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`extractedText` text,
	`status` enum('uploaded','processing','completed','failed') NOT NULL DEFAULT 'uploaded',
	`errorMessage` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchSources` (
	`id` varchar(64) NOT NULL,
	`summaryId` varchar(64) NOT NULL,
	`sourceType` enum('book','study','expert','philosophy') NOT NULL,
	`bookTitle` varchar(255),
	`authorName` varchar(255),
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `researchSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` varchar(64) NOT NULL,
	`documentId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`bookTitle` varchar(255),
	`bookAuthor` varchar(255),
	`onePageSummary` text,
	`introduction` text,
	`mainContent` text,
	`status` enum('generating','completed','failed') NOT NULL DEFAULT 'generating',
	`errorMessage` text,
	`researchSourcesCount` int DEFAULT 0,
	`shortformNotesCount` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `summaries_id` PRIMARY KEY(`id`)
);
