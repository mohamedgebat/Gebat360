-- ==============================================================================
-- MIGRATION 003 : AUDIT TRAIL INALTÉRABLE, PRODUCTION ET PERFORMANCE
-- GEBAT 360° ERP Database Versioning
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `cost_natures` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `label` VARCHAR(100) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'Actif',
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `production_reports` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATETIME NOT NULL,
  `project_id` VARCHAR(50) NOT NULL,
  `project_name` VARCHAR(150) NOT NULL,
  `wbs_id` VARCHAR(50) NOT NULL,
  `wbs_code` VARCHAR(50) NOT NULL,
  `activity_name` VARCHAR(150) NOT NULL,
  `weather` VARCHAR(30) DEFAULT 'Ensoleillé',
  `planned_qty` DECIMAL(15,2) NOT NULL,
  `realized_qty` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `workers_count` INT DEFAULT 0,
  `hours_worked` INT DEFAULT 0,
  `notes` TEXT,
  `status` VARCHAR(30) DEFAULT 'Validé',
  `created_by` VARCHAR(100) NOT NULL,
  `productivity` DECIMAL(5,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `planning_tasks` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `project_id` VARCHAR(50) NOT NULL,
  `wbs_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `duration_days` INT NOT NULL,
  `progress` DECIMAL(5,2) DEFAULT 0.00,
  `status` VARCHAR(30) DEFAULT 'En cours',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cost_transactions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `wbs_id` VARCHAR(50) NOT NULL,
  `nature` VARCHAR(20) NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `source` VARCHAR(100) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`wbs_id`) REFERENCES `wbs_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eac_snapshots` (
  `id` VARCHAR(50) PRIMARY KEY,
  `wbs_id` VARCHAR(50) NOT NULL,
  `budget_ds` DECIMAL(18,2) NOT NULL,
  `actual_cost` DECIMAL(18,2) NOT NULL,
  `forecast` DECIMAL(18,2) NOT NULL,
  `eac` DECIMAL(18,2) NOT NULL,
  `eac_margin` DECIMAL(18,2) NOT NULL,
  `justification` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`wbs_id`) REFERENCES `wbs_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(50) PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(30) DEFAULT 'INFO',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `user_id` VARCHAR(50) DEFAULT 'usr-admin-01',
  `user` VARCHAR(100) NOT NULL DEFAULT 'Yacouba Mohamed',
  `role` VARCHAR(50) NOT NULL DEFAULT 'Super Admin',
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT 'WbsNode',
  `entity_id` VARCHAR(50),
  `module` VARCHAR(50) DEFAULT 'WBS',
  `object_ref` VARCHAR(100) DEFAULT 'CVI-2026-HYD-001/03/02/004',
  `old_value` TEXT,
  `new_value` TEXT,
  `reason` TEXT,
  `justification` TEXT,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
