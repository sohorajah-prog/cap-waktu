CREATE TABLE `regions` (
	`code` text PRIMARY KEY NOT NULL,
	`parent_code` text,
	`level` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `regions_parent_idx` ON `regions` (`parent_code`,`name`);--> statement-breakpoint
ALTER TABLE `results` ADD `region_code` text;--> statement-breakpoint
ALTER TABLE `results` ADD `region_label` text;