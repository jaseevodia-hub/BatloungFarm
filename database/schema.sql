-- ============================================================
-- Batloung Farm Distribution System
-- MySQL database schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS batloung_farm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE batloung_farm;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS sales_details;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS purchase_details;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS fruit_prices;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS fruits;
DROP TABLE IF EXISTS suppliers;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Suppliers
-- ------------------------------------------------------------
CREATE TABLE suppliers (
  supplier_id INT UNSIGNED AUTO_INCREMENT,
  business_name VARCHAR(120) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province ENUM(
    'Gauteng',
    'Free State',
    'KwaZulu-Natal',
    'Western Cape',
    'Eastern Cape',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape'
  ) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id),
  UNIQUE KEY uq_suppliers_business_name (business_name),
  UNIQUE KEY uq_suppliers_phone (phone),
  KEY idx_suppliers_province (province)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Fruits
-- ------------------------------------------------------------
CREATE TABLE fruits (
  fruit_id INT UNSIGNED AUTO_INCREMENT,
  fruit_name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fruit_id),
  UNIQUE KEY uq_fruits_name (fruit_name)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Selling prices per fruit and packaging size
-- ------------------------------------------------------------
CREATE TABLE fruit_prices (
  price_id INT UNSIGNED AUTO_INCREMENT,
  fruit_id INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (price_id),
  UNIQUE KEY uq_fruit_prices (fruit_id, packaging_size),
  CONSTRAINT chk_fruit_prices_positive CHECK (selling_price > 0),
  CONSTRAINT fk_fruit_prices_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Vendors
-- ------------------------------------------------------------
CREATE TABLE vendors (
  vendor_id INT UNSIGNED AUTO_INCREMENT,
  vendor_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  location VARCHAR(150) NOT NULL,
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  registration_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vendor_id),
  UNIQUE KEY uq_vendors_phone (phone_number),
  KEY idx_vendors_name (vendor_name),
  CONSTRAINT chk_vendors_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_vendors_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Stock (one row per fruit and packaging size)
-- ------------------------------------------------------------
CREATE TABLE stock (
  stock_id INT UNSIGNED AUTO_INCREMENT,
  fruit_id INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  available_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stock_id),
  UNIQUE KEY uq_stock_fruit_packaging (fruit_id, packaging_size),
  CONSTRAINT chk_stock_non_negative CHECK (available_quantity >= 0),
  CONSTRAINT fk_stock_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Purchases
-- ------------------------------------------------------------
CREATE TABLE purchases (
  purchase_id INT UNSIGNED AUTO_INCREMENT,
  supplier_id INT UNSIGNED NOT NULL,
  purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (purchase_id),
  KEY idx_purchases_supplier (supplier_id),
  KEY idx_purchases_date (purchase_date),
  CONSTRAINT chk_purchases_total CHECK (total_amount >= 0),
  CONSTRAINT fk_purchases_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Purchase details
-- ------------------------------------------------------------
CREATE TABLE purchase_details (
  purchase_detail_id INT UNSIGNED AUTO_INCREMENT,
  purchase_id INT UNSIGNED NOT NULL,
  fruit_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  packaging_size ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  PRIMARY KEY (purchase_detail_id),
  KEY idx_purchase_details_purchase (purchase_id),
  KEY idx_purchase_details_fruit (fruit_id),
  CONSTRAINT chk_purchase_details_quantity CHECK (quantity > 0),
  CONSTRAINT chk_purchase_details_cost CHECK (unit_cost >= 0),
  CONSTRAINT fk_purchase_details_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases (purchase_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_purchase_details_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Sales
-- ------------------------------------------------------------
CREATE TABLE sales (
  sale_id INT UNSIGNED AUTO_INCREMENT,
  vendor_id INT UNSIGNED NOT NULL,
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('PAID', 'PARTIALLY_PAID', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
  payment_method ENUM('CASH', 'MOBILE_MONEY', 'CREDIT') NOT NULL DEFAULT 'CASH',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sale_id),
  KEY idx_sales_vendor (vendor_id),
  KEY idx_sales_date (sale_date),
  KEY idx_sales_payment_status (payment_status),
  CONSTRAINT chk_sales_total CHECK (total_amount >= 0),
  CONSTRAINT chk_sales_amount_paid CHECK (amount_paid >= 0),
  CONSTRAINT chk_sales_payment_limit CHECK (amount_paid <= total_amount),
  CONSTRAINT fk_sales_vendor
    FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Sales details
-- ------------------------------------------------------------
CREATE TABLE sales_details (
  sales_detail_id INT UNSIGNED AUTO_INCREMENT,
  sale_id INT UNSIGNED NOT NULL,
  fruit_id INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (sales_detail_id),
  KEY idx_sales_details_sale (sale_id),
  KEY idx_sales_details_fruit (fruit_id),
  CONSTRAINT chk_sales_details_quantity CHECK (quantity > 0),
  CONSTRAINT chk_sales_details_price CHECK (unit_price > 0),
  CONSTRAINT fk_sales_details_sale
    FOREIGN KEY (sale_id) REFERENCES sales (sale_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sales_details_fruit
    FOREIGN KEY (fruit_id) REFERENCES fruits (fruit_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Payments (cash/mobile money received against a sale)
-- ------------------------------------------------------------
CREATE TABLE payments (
  payment_id INT UNSIGNED AUTO_INCREMENT,
  sale_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('CASH', 'MOBILE_MONEY') NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_payments_sale (sale_id),
  KEY idx_payments_date (payment_date),
  CONSTRAINT chk_payments_amount CHECK (amount > 0),
  CONSTRAINT fk_payments_sale
    FOREIGN KEY (sale_id) REFERENCES sales (sale_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
