-- ==============================================================================
-- MIGRATION 001 : INITIALISATION DES TABLES CORE (UTILISATEURS, PROJETS, WBS)
-- GEBAT 360° ERP Database Versioning
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `companies` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `country` VARCHAR(50) DEFAULT 'Côte d''Ivoire',
  `address` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `role` VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  `avatar` VARCHAR(10) DEFAULT 'US',
  `photo_url` VARCHAR(255),
  `phone` VARCHAR(30),
  `employee_code` VARCHAR(50),
  `company` VARCHAR(100) DEFAULT 'GEBAT SA',
  `password_hash` VARCHAR(255) NOT NULL,
  `must_change_password` TINYINT(1) DEFAULT 0,
  `status` VARCHAR(20) DEFAULT 'ACTIF',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `domain_code` VARCHAR(20),
  `name` VARCHAR(150) NOT NULL,
  `company_id` VARCHAR(50),
  `company` VARCHAR(100) NOT NULL,
  `client` VARCHAR(100) NOT NULL,
  `country` VARCHAR(50) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `activity` VARCHAR(100) NOT NULL,
  `manager` VARCHAR(100) NOT NULL,
  `contract_ref` VARCHAR(50) NOT NULL,
  `contract_amount` DECIMAL(18,2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'XOF',
  `signature_date` DATETIME NOT NULL,
  `start_date` DATETIME NOT NULL,
  `duration_months` INT NOT NULL,
  `end_date` DATETIME NOT NULL,
  `initial_budget` DECIMAL(18,2) NOT NULL,
  `revised_budget` DECIMAL(18,2) NOT NULL,
  `progress` DECIMAL(5,2) DEFAULT 0.00,
  `status` VARCHAR(30) DEFAULT 'EN_COURS',
  `risk` VARCHAR(20) DEFAULT 'FAIBLE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wbs_nodes` (
  `id` VARCHAR(50) PRIMARY KEY,
  `project_id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `unit` VARCHAR(20) DEFAULT 'm3',
  `planned_qty` DECIMAL(15,2) DEFAULT 0,
  `unit_cost` DECIMAL(18,2) DEFAULT 0,
  `contract_unit_price` DECIMAL(18,2) DEFAULT 0,
  `contract_amount` DECIMAL(18,2) DEFAULT 0,
  `initial_budget` DECIMAL(18,2) DEFAULT 0,
  `revised_budget` DECIMAL(18,2) DEFAULT 0,
  `reserved` DECIMAL(18,2) DEFAULT 0,
  `committed` DECIMAL(18,2) DEFAULT 0,
  `received` DECIMAL(18,2) DEFAULT 0,
  `invoiced` DECIMAL(18,2) DEFAULT 0,
  `actual_cost` DECIMAL(18,2) DEFAULT 0,
  `remaining_to_commit` DECIMAL(18,2) DEFAULT 0,
  `remaining_to_produce` DECIMAL(15,2) DEFAULT 0,
  `forecast` DECIMAL(18,2) DEFAULT 0,
  `eac` DECIMAL(18,2) DEFAULT 0,
  `progress` DECIMAL(5,2) DEFAULT 0,
  `nature` VARCHAR(20) DEFAULT 'MAT',
  `manager` VARCHAR(100) DEFAULT 'Chef de Chantier',
  `parent_id` VARCHAR(50),
  `level` VARCHAR(20) DEFAULT 'ACTIVITE',
  `type` VARCHAR(20) DEFAULT 'ACTIVITE',
  `status` VARCHAR(30) DEFAULT 'EN_COURS',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
