-- ==============================================================================
-- GEBAT 360° | SCHÉMA DE BASE DE DONNÉES MYSQL (PHASE 1 - CORE MVP)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `gebat_360_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `gebat_360_db`;

-- 1. Table Utilisateurs
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `role` VARCHAR(50) NOT NULL,
  `avatar` VARCHAR(10) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table Projets
CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `company` VARCHAR(100) NOT NULL,
  `client` VARCHAR(100) NOT NULL,
  `country` VARCHAR(50) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `activity` VARCHAR(100) NOT NULL,
  `manager` VARCHAR(100) NOT NULL,
  `contract_ref` VARCHAR(50) NOT NULL,
  `contract_amount` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'XOF',
  `signature_date` DATE NOT NULL,
  `start_date` DATE NOT NULL,
  `duration_months` INT NOT NULL,
  `end_date` DATE NOT NULL,
  `initial_budget` DECIMAL(15,2) NOT NULL,
  `revised_budget` DECIMAL(15,2) NOT NULL,
  `progress` DECIMAL(5,2) DEFAULT 0.00,
  `status` VARCHAR(30) DEFAULT 'En cours',
  `risk` VARCHAR(20) DEFAULT 'Faible',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table WBS (Work Breakdown Structure)
CREATE TABLE IF NOT EXISTS `wbs_nodes` (
  `id` VARCHAR(50) PRIMARY KEY,
  `project_id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(20),
  `planned_qty` DECIMAL(12,2) DEFAULT 0,
  `unit_cost` DECIMAL(12,2) DEFAULT 0,
  `initial_budget` DECIMAL(15,2) NOT NULL,
  `revised_budget` DECIMAL(15,2) NOT NULL,
  `committed` DECIMAL(15,2) DEFAULT 0,
  `actual_cost` DECIMAL(15,2) DEFAULT 0,
  `forecast` DECIMAL(15,2) DEFAULT 0,
  `eac` DECIMAL(15,2) DEFAULT 0,
  `progress` DECIMAL(5,2) DEFAULT 0,
  `nature` VARCHAR(20) NOT NULL,
  `manager` VARCHAR(100),
  `parent_id` VARCHAR(50),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table Demandes d'Achat (DA)
CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `project_id` VARCHAR(50) NOT NULL,
  `project_name` VARCHAR(150) NOT NULL,
  `wbs_id` VARCHAR(50) NOT NULL,
  `wbs_code` VARCHAR(50) NOT NULL,
  `wbs_name` VARCHAR(150) NOT NULL,
  `nature` VARCHAR(20) NOT NULL,
  `item_description` TEXT NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `estimated_unit_price` DECIMAL(15,2) NOT NULL,
  `estimated_total` DECIMAL(15,2) NOT NULL,
  `desired_date` DATE NOT NULL,
  `urgency` VARCHAR(20) DEFAULT 'Normale',
  `justification` TEXT,
  `created_by` VARCHAR(100) NOT NULL,
  `created_at` VARCHAR(30) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'En attente validation',
  `is_over_budget` TINYINT(1) DEFAULT 0,
  `over_budget_amount` DECIMAL(15,2) DEFAULT 0,
  `po_number` VARCHAR(50),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table Bons de Commande (BC)
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `da_id` VARCHAR(50) NOT NULL,
  `supplier` VARCHAR(150) NOT NULL,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `issue_date` VARCHAR(30) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'Émis',
  FOREIGN KEY (`da_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table Réceptions Marchandises
CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `po_id` VARCHAR(50) NOT NULL,
  `po_code` VARCHAR(50) NOT NULL,
  `project_id` VARCHAR(50) NOT NULL,
  `wbs_id` VARCHAR(50) NOT NULL,
  `supplier` VARCHAR(150) NOT NULL,
  `receipt_date` VARCHAR(30) NOT NULL,
  `received_by` VARCHAR(100) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'Validé',
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table Articles Stock
CREATE TABLE IF NOT EXISTS `stock_items` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `warehouse` VARCHAR(100) NOT NULL,
  `min_threshold` DECIMAL(12,2) DEFAULT 0,
  `current_stock` DECIMAL(12,2) DEFAULT 0,
  `average_unit_price` DECIMAL(15,2) DEFAULT 0,
  `total_value` DECIMAL(15,2) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table Mouvements de Stock
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `type` VARCHAR(20) NOT NULL,
  `item_id` VARCHAR(50) NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `total_cost` DECIMAL(15,2) NOT NULL,
  `warehouse` VARCHAR(100) NOT NULL,
  `project_id` VARCHAR(50),
  `wbs_id` VARCHAR(50),
  `wbs_code` VARCHAR(50),
  `wbs_name` VARCHAR(150),
  `source_doc` VARCHAR(100) NOT NULL,
  `user` VARCHAR(100) NOT NULL,
  `date` VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Table Rapports Journaliers de Chantier
CREATE TABLE IF NOT EXISTS `daily_reports` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `project_id` VARCHAR(50) NOT NULL,
  `project_name` VARCHAR(150) NOT NULL,
  `wbs_id` VARCHAR(50) NOT NULL,
  `wbs_code` VARCHAR(50) NOT NULL,
  `activity_name` VARCHAR(150) NOT NULL,
  `weather` VARCHAR(30) NOT NULL,
  `planned_qty` DECIMAL(12,2) NOT NULL,
  `realized_qty` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `workers_count` INT NOT NULL,
  `hours_worked` INT NOT NULL,
  `equipment_count` INT NOT NULL,
  `equipment_hours` INT NOT NULL,
  `notes` TEXT,
  `status` VARCHAR(30) DEFAULT 'Validé',
  `created_by` VARCHAR(100) NOT NULL,
  `productivity_rate` DECIMAL(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Table System Alerts
CREATE TABLE IF NOT EXISTS `system_alerts` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `severity` VARCHAR(20) NOT NULL,
  `project_id` VARCHAR(50),
  `project_name` VARCHAR(150),
  `wbs_id` VARCHAR(50),
  `wbs_code` VARCHAR(50),
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `observed_value` VARCHAR(100),
  `threshold_value` VARCHAR(100),
  `assigned_to_role` VARCHAR(50),
  `created_at` VARCHAR(30) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'Actif'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Table Audit Trail Inaltérable
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `timestamp` VARCHAR(30) NOT NULL,
  `user` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `object_ref` VARCHAR(100) NOT NULL,
  `old_value` TEXT,
  `new_value` TEXT,
  `justification` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
