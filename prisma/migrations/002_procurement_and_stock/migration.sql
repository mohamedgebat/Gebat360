-- ==============================================================================
-- MIGRATION 002 : ACHATS, FOURNISSEURS, COMMANDES, STOCKS ET FACTURATION
-- GEBAT 360° ERP Database Versioning
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `contact_person` VARCHAR(100),
  `phone` VARCHAR(30),
  `email` VARCHAR(100),
  `address` TEXT,
  `tax_number` VARCHAR(50),
  `status` VARCHAR(20) DEFAULT 'Actif',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  `quantity` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `estimated_unit_price` DECIMAL(18,2) NOT NULL,
  `estimated_total` DECIMAL(18,2) NOT NULL,
  `desired_date` DATETIME NOT NULL,
  `urgency` VARCHAR(20) DEFAULT 'Normale',
  `justification` TEXT,
  `created_by` VARCHAR(100) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'EN_VALIDATION',
  `is_over_budget` TINYINT(1) DEFAULT 0,
  `over_budget_amount` DECIMAL(18,2) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`wbs_id`) REFERENCES `wbs_nodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `da_id` VARCHAR(50) NOT NULL,
  `supplier_id` VARCHAR(50) NOT NULL,
  `total_amount` DECIMAL(18,2) NOT NULL,
  `issue_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(30) DEFAULT 'ORDERED',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`da_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `po_id` VARCHAR(50) NOT NULL,
  `po_code` VARCHAR(50) NOT NULL,
  `project_id` VARCHAR(50) NOT NULL,
  `wbs_id` VARCHAR(50) NOT NULL,
  `supplier` VARCHAR(150) NOT NULL,
  `receipt_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `received_by` VARCHAR(100) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'RECEIVED',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `supplier_invoices` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `receipt_id` VARCHAR(50) NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL,
  `supplier` VARCHAR(150) NOT NULL,
  `invoice_amount` DECIMAL(18,2) NOT NULL,
  `invoice_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `due_date` DATETIME NOT NULL,
  `status` VARCHAR(30) DEFAULT 'INVOICED',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`receipt_id`) REFERENCES `goods_receipts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `manager` VARCHAR(100) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stock_items` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `warehouse_id` VARCHAR(50),
  `warehouse` VARCHAR(100) NOT NULL,
  `min_threshold` DECIMAL(12,2) DEFAULT 0,
  `current_stock` DECIMAL(12,2) DEFAULT 0,
  `average_unit_price` DECIMAL(18,2) DEFAULT 0,
  `total_value` DECIMAL(18,2) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `movement_type` VARCHAR(20) NOT NULL DEFAULT 'IN',
  `type` VARCHAR(20) DEFAULT 'ENTREE',
  `item_id` VARCHAR(50) NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `warehouse_id` VARCHAR(50),
  `warehouse` VARCHAR(100) NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `unit_cost` DECIMAL(18,2) NOT NULL,
  `total_cost` DECIMAL(18,2) NOT NULL,
  `project_id` VARCHAR(50),
  `wbs_id` VARCHAR(50),
  `wbs_code` VARCHAR(50),
  `wbs_name` VARCHAR(150),
  `reference` VARCHAR(100) NOT NULL DEFAULT 'BL-001',
  `source_doc` VARCHAR(100) NOT NULL DEFAULT 'BL-001',
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'Magasinier',
  `user` VARCHAR(100) NOT NULL DEFAULT 'Magasinier',
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
