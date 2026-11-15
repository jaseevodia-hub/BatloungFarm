-- ============================================================
-- Batloung Farm Distribution System
-- Realistic sample data
-- ============================================================

USE batloung_farm;

-- Suppliers across all nine South African provinces
INSERT INTO suppliers
  (supplier_id, business_name, contact_person, phone, province, address)
VALUES
  (1, 'Highveld Fresh Produce', 'Thabo Mokoena', '+27 11 555 0142', 'Gauteng', '12 Market Road, Johannesburg'),
  (2, 'Bloem Fruit Traders', 'Anelisa Dlamini', '+27 51 444 7781', 'Free State', '45 Nelson Mandela Drive, Bloemfontein'),
  (3, 'Durban Coastal Fruits', 'Priya Naidoo', '+27 31 332 9088', 'KwaZulu-Natal', '8 Victoria Embankment, Durban'),
  (4, 'Cape Vineyards Supply', 'Willem van der Merwe', '+27 21 465 2210', 'Western Cape', '21 Long Street, Cape Town'),
  (5, 'Eastern Cape Citrus Co.', 'Nomvula Mbeki', '+27 41 582 3344', 'Eastern Cape', '5 Govan Mbeki Avenue, Gqeberha'),
  (6, 'Limpopo Tropical Farms', 'Kgaugelo Sithole', '+27 15 291 6677', 'Limpopo', '14 Landdros Mare Street, Polokwane'),
  (7, 'Mpumalanga Orchards', 'Lerato Mahlangu', '+27 13 752 1188', 'Mpumalanga', '33 Samora Machel Street, Mbombela'),
  (8, 'North West Harvest', 'Pieter Botha', '+27 18 381 4499', 'North West', '9 Dr James Moroka Drive, Rustenburg'),
  (9, 'Karoo Sun Produce', 'Johannes Ockhuys', '+27 54 332 7710', 'Northern Cape', '7 Schroder Street, Upington');

-- Fruits
INSERT INTO fruits (fruit_id, fruit_name, description, status)
VALUES
  (1, 'Apples', 'Fresh crisp apples sourced from Western Cape and Free State orchards.', 'ACTIVE'),
  (2, 'Bananas', 'Ripened bananas supplied from KwaZulu-Natal and Mpumalanga.', 'ACTIVE'),
  (3, 'Oranges', 'Juicy citrus oranges from Limpopo and Eastern Cape farms.', 'ACTIVE'),
  (4, 'Mangoes', 'Sweet seasonal mangoes from Limpopo tropical farms.', 'ACTIVE'),
  (5, 'Grapes', 'Premium table grapes from Western Cape vineyards.', 'ACTIVE');

-- Selling prices per packaging size (each size has a different price)
INSERT INTO fruit_prices (fruit_id, packaging_size, selling_price)
VALUES
  (1, 'SMALL', 25.00), (1, 'MEDIUM', 45.00), (1, 'LARGE', 80.00),
  (2, 'SMALL', 30.00), (2, 'MEDIUM', 55.00), (2, 'LARGE', 95.00),
  (3, 'SMALL', 28.00), (3, 'MEDIUM', 50.00), (3, 'LARGE', 90.00),
  (4, 'SMALL', 40.00), (4, 'MEDIUM', 75.00), (4, 'LARGE', 130.00),
  (5, 'SMALL', 55.00), (5, 'MEDIUM', 100.00), (5, 'LARGE', 180.00);

-- Separate stock balance for every fruit and packaging size
INSERT INTO stock (fruit_id, packaging_size, available_quantity)
VALUES
  (1, 'SMALL', 120), (1, 'MEDIUM', 85), (1, 'LARGE', 40),
  (2, 'SMALL', 90),  (2, 'MEDIUM', 60), (2, 'LARGE', 9),
  (3, 'SMALL', 110), (3, 'MEDIUM', 70), (3, 'LARGE', 50),
  (4, 'SMALL', 35),  (4, 'MEDIUM', 22), (4, 'LARGE', 6),
  (5, 'SMALL', 45),  (5, 'MEDIUM', 20), (5, 'LARGE', 8);

-- Vendors in Lesotho
INSERT INTO vendors
  (vendor_id, vendor_name, phone_number, location, registration_date)
VALUES
  (1, 'Maseru Central Vendor', '+266 5800 1122', 'Maseru CBD', '2025-01-15'),
  (2, 'Thabang Fruit Stall', '+266 6200 3344', 'Maseru Market', '2025-02-03'),
  (3, 'Leribe Road Vendors', '+266 5700 5566', 'Leribe', '2025-03-20'),
  (4, 'Mafeteng Street Trader', '+266 6300 7788', 'Mafeteng', '2025-05-11'),
  (5, 'Roma Market Stall', '+266 5900 9900', 'Roma', '2025-07-08'),
  (6, 'Mohale''s Hoek Fresh', '+266 6400 2233', 'Mohale''s Hoek', '2025-09-02');

-- Purchases
INSERT INTO purchases (purchase_id, supplier_id, purchase_date, total_amount)
VALUES
  (1, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), 3050.00),
  (2, 4, DATE_SUB(NOW(), INTERVAL 15 DAY), 4250.00),
  (3, 6, DATE_SUB(NOW(), INTERVAL 10 DAY), 5580.00),
  (4, 3, DATE_SUB(NOW(), INTERVAL 7 DAY),  4700.00),
  (5, 2, DATE_SUB(NOW(), INTERVAL 4 DAY),  3680.00),
  (6, 7, DATE_SUB(NOW(), INTERVAL 2 DAY),  4160.00);

INSERT INTO purchase_details
  (purchase_id, fruit_id, quantity, unit_cost, packaging_size)
VALUES
  (1, 1, 50, 45.00, 'MEDIUM'),
  (1, 2, 40, 20.00, 'SMALL'),
  (2, 5, 30, 95.00, 'MEDIUM'),
  (2, 1, 20, 70.00, 'LARGE'),
  (3, 4, 30, 110.00, 'LARGE'),
  (3, 3, 60, 38.00, 'MEDIUM'),
  (4, 2, 50, 70.00, 'LARGE'),
  (4, 4, 20, 60.00, 'MEDIUM'),
  (5, 1, 60, 18.00, 'SMALL'),
  (5, 3, 40, 65.00, 'LARGE'),
  (6, 5, 25, 140.00, 'LARGE'),
  (6, 3, 30, 22.00, 'SMALL');

-- Sales
INSERT INTO sales
  (sale_id, vendor_id, sale_date, payment_status, payment_method, total_amount, amount_paid)
VALUES
  (1, 1, DATE_SUB(NOW(), INTERVAL 18 DAY), 'PAID', 'CASH', 337.00, 337.00),
  (2, 2, DATE_SUB(NOW(), INTERVAL 16 DAY), 'PAID', 'MOBILE_MONEY', 395.00, 395.00),
  (3, 3, DATE_SUB(NOW(), INTERVAL 14 DAY), 'PARTIALLY_PAID', 'CREDIT', 340.00, 140.00),
  (4, 1, DATE_SUB(NOW(), INTERVAL 12 DAY), 'PAID', 'CASH', 365.00, 365.00),
  (5, 4, DATE_SUB(NOW(), INTERVAL 10 DAY), 'PAID', 'MOBILE_MONEY', 480.00, 480.00),
  (6, 5, DATE_SUB(NOW(), INTERVAL 8 DAY), 'UNPAID', 'CREDIT', 375.00, 0.00),
  (7, 2, DATE_SUB(NOW(), INTERVAL 6 DAY), 'PAID', 'CASH', 340.00, 340.00),
  (8, 6, DATE_SUB(NOW(), INTERVAL 5 DAY), 'PAID', 'MOBILE_MONEY', 260.00, 260.00),
  (9, 3, DATE_SUB(NOW(), INTERVAL 3 DAY), 'PARTIALLY_PAID', 'CREDIT', 570.00, 300.00),
  (10, 1, DATE_SUB(NOW(), INTERVAL 2 DAY), 'PAID', 'CASH', 214.00, 214.00),
  (11, 4, DATE_SUB(NOW(), INTERVAL 1 DAY), 'PAID', 'MOBILE_MONEY', 380.00, 380.00),
  (12, 5, NOW(), 'PAID', 'CASH', 140.00, 140.00);

INSERT INTO sales_details
  (sale_id, fruit_id, packaging_size, quantity, unit_price)
VALUES
  (1, 1, 'MEDIUM', 5, 45.00),
  (1, 3, 'SMALL', 4, 28.00),
  (2, 2, 'LARGE', 3, 95.00),
  (2, 5, 'SMALL', 2, 55.00),
  (3, 4, 'LARGE', 2, 130.00),
  (3, 1, 'LARGE', 1, 80.00),
  (4, 5, 'MEDIUM', 2, 100.00),
  (4, 2, 'MEDIUM', 3, 55.00),
  (5, 3, 'MEDIUM', 6, 50.00),
  (5, 1, 'MEDIUM', 4, 45.00),
  (6, 4, 'MEDIUM', 3, 75.00),
  (6, 2, 'SMALL', 5, 30.00),
  (7, 1, 'LARGE', 2, 80.00),
  (7, 5, 'LARGE', 1, 180.00),
  (8, 3, 'LARGE', 2, 90.00),
  (8, 4, 'SMALL', 2, 40.00),
  (9, 2, 'MEDIUM', 4, 55.00),
  (9, 1, 'SMALL', 6, 25.00),
  (9, 5, 'MEDIUM', 2, 100.00),
  (10, 4, 'LARGE', 1, 130.00),
  (10, 3, 'SMALL', 3, 28.00),
  (11, 1, 'MEDIUM', 3, 45.00),
  (11, 2, 'LARGE', 2, 95.00),
  (11, 5, 'SMALL', 1, 55.00),
  (12, 3, 'MEDIUM', 2, 50.00),
  (12, 4, 'SMALL', 1, 40.00);

-- Payments received (cash and mobile money)
INSERT INTO payments (sale_id, amount, payment_method, payment_date, reference)
VALUES
  (1, 337.00, 'CASH', DATE_SUB(NOW(), INTERVAL 18 DAY), 'SALE-1'),
  (2, 395.00, 'MOBILE_MONEY', DATE_SUB(NOW(), INTERVAL 16 DAY), 'M-PESA-1002'),
  (3, 140.00, 'CASH', DATE_SUB(NOW(), INTERVAL 14 DAY), 'DEPOSIT-3'),
  (4, 365.00, 'CASH', DATE_SUB(NOW(), INTERVAL 12 DAY), 'SALE-4'),
  (5, 480.00, 'MOBILE_MONEY', DATE_SUB(NOW(), INTERVAL 10 DAY), 'M-PESA-1005'),
  (7, 340.00, 'CASH', DATE_SUB(NOW(), INTERVAL 6 DAY), 'SALE-7'),
  (8, 260.00, 'MOBILE_MONEY', DATE_SUB(NOW(), INTERVAL 5 DAY), 'M-PESA-1008'),
  (9, 300.00, 'MOBILE_MONEY', DATE_SUB(NOW(), INTERVAL 3 DAY), 'DEPOSIT-9'),
  (10, 214.00, 'CASH', DATE_SUB(NOW(), INTERVAL 2 DAY), 'SALE-10'),
  (11, 380.00, 'MOBILE_MONEY', DATE_SUB(NOW(), INTERVAL 1 DAY), 'M-PESA-1011'),
  (12, 140.00, 'CASH', NOW(), 'SALE-12');
