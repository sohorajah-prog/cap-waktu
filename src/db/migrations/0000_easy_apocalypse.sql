CREATE TABLE `results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`upload_id` integer NOT NULL,
	`location_name` text DEFAULT '' NOT NULL,
	`latitude` text,
	`longitude` text,
	`date_format` text NOT NULL,
	`legend_position` text NOT NULL,
	`font_size` integer NOT NULL,
	`font_color` text NOT NULL,
	`font_family` text NOT NULL,
	`show_plate` integer DEFAULT true NOT NULL,
	`output_path` text NOT NULL,
	`output_format` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`stamped_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `results_created_at_idx` ON `results` (`created_at`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_path` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
