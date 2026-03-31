-- ============================================================
-- EZStore 測試資料集 (Test Seed Data)
-- 用途：E2E 測試、開發環境初始化
-- 使用方式：
--   docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql
--   或
--   psql -U ezstore -h localhost -d ezstore -f scripts/seed-test-data.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 清空所有資料（依照外鍵順序）
-- ============================================================
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE quotation_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE quotations CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE customers CASCADE;

-- 重設序列
ALTER SEQUENCE customers_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE quotations_id_seq RESTART WITH 1;
ALTER SEQUENCE quotation_items_id_seq RESTART WITH 1;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;

-- ============================================================
-- 客戶資料（15 筆：5 VIP、6 Standard、4 New）
-- ============================================================
INSERT INTO customers (id, created_at, updated_at, name, tax_id, contact_name, contact_phone, contact_email, address, level, credit_score) VALUES
-- VIP 客戶（高信用評分）
(1,  '2025-06-15 09:00:00+08', '2026-03-01 10:00:00+08', '史塔克工業股份有限公司',   '12345678', '乃寶貴', '02-27001234', 'pepper@stark-ind.example',     '台北市信義區方舟大道100號12樓',    'vip',      95),
(2,  '2025-07-20 14:30:00+08', '2026-02-15 09:00:00+08', '乘黃株式會社',             '22345678', '大木博士', '02-26981688', 'oak@pokemon-lab.example',    '新北市土城區寶可夢街2號',          'vip',      92),
(3,  '2025-08-10 10:00:00+08', '2026-01-20 11:30:00+08', '膠囊公司',                 '32345678', '布瑪',   '03-5670766',  'bulma@capsule-corp.example',   '新竹市西都大道1號',               'vip',      88),
(4,  '2025-09-05 16:00:00+08', '2026-03-10 08:45:00+08', '韋恩企業股份有限公司',     '42345678', '乙乙',   '02-28822888', 'lucius@wayne-ent.example',     '桃園市龜山區高譚路188號',          'vip',      90),
(5,  '2025-10-01 11:15:00+08', '2026-03-20 14:00:00+08', '神盾局科技股份有限公司',   '52345678', '乙由',   '02-28943447', 'coulson@shield-tech.example',  '台北市北投區天空母艦路15號',       'vip',      85),

-- Standard 客戶（中等信用評分）
(6,  '2025-11-12 09:30:00+08', '2026-02-28 10:00:00+08', '噬元獸寵物用品有限公司',   '62345678', '尼可樂', '02-87986888', 'fury@goose-pet.example',       '台北市內湖區九頭蛇路392號',       'standard', 75),
(7,  '2025-11-20 13:00:00+08', '2026-03-05 16:30:00+08', '中央城快遞股份有限公司',   '72345678', '倍利',   '02-89786688', 'barry@centralcity-ex.example', '台北市內湖區閃電路581號',         'standard', 70),
(8,  '2025-12-01 10:45:00+08', '2026-03-15 09:15:00+08', '藍貓快遞有限公司',         '82345678', '淘氣',   '02-66126612', 'taoqi@bluecat.example',        '新北市汐止區翻斗路一段93號',      'standard', 68),
(9,  '2026-01-05 15:00:00+08', '2026-03-18 11:00:00+08', '日落黃昏鎮商會',           '92345678', '乃洛特', '02-26200888', 'woody@sunset.example',         '台北市北投區牛仔大街222號',       'standard', 72),
(10, '2026-01-15 08:30:00+08', '2026-03-22 13:45:00+08', '平澤股份有限公司',         '10345678', '甲意',   '02-22270606', 'kaede@hirasawa.example',       '桃園市龜山區輕音路211號',         'standard', 65),
(11, '2026-02-01 11:00:00+08', '2026-03-25 10:30:00+08', '月影莊園有限公司',         '11345678', '坂出',   '02-25925252', 'tanaka@moonlight.example',     '台北市中山區月見路三段22號',      'standard', 60),

-- New 客戶（較低信用評分）
(12, '2026-02-20 09:00:00+08', '2026-03-28 14:00:00+08', '怪獸電力公司',             '13345678', '毛哥',   '02-27531688', 'sulley@monsters-inc.example',  '台北市松山區驚嚇大道186號',       'new',      45),
(13, '2026-03-01 10:30:00+08', '2026-03-29 09:30:00+08', '天空之城科技有限公司',     '14345678', '乃羽',   '04-22585858', 'pazu@laputa-tech.example',     '台中市西屯區飛行石大道99號',       'new',      40),
(14, '2026-03-10 14:15:00+08', '2026-03-30 11:00:00+08', '魔女宅急便股份有限公司',   '15345678', '阿琪',   '07-3368888',  'kiki@witch-delivery.example',  '高雄市前鎮區掃帚街88號',          'new',      50),
(15, '2026-03-20 16:45:00+08', '2026-03-30 16:00:00+08', '無臉男金融服務有限公司',   '16345678', '千丁',   '03-5784500',  'chihiro@spirited.example',     '新竹市東區油屋路二段295號',       'new',      35);

SELECT setval('customers_id_seq', 15);

-- ============================================================
-- 產品資料（20 筆：辦公設備、耗材、網路設備、軟體授權）
-- ============================================================
INSERT INTO products (id, created_at, updated_at, product_number, name, description, cost, list_price, inventory, supplier) VALUES
-- 辦公設備
(1,  '2025-06-01 09:00:00+08', '2026-03-01 09:00:00+08', 'EQ-001', '商用雷射印表機 LJ-5200',       '高速商用雷射印表機，每分鐘40頁',                   12000.00, 22000.00, 50,   '京瓷辦公設備'),
(2,  '2025-06-01 09:00:00+08', '2026-03-01 09:00:00+08', 'EQ-002', '27吋商用液晶螢幕 M27-Pro',     '27吋 IPS 面板，2K解析度，可旋轉底座',               5500.00,  9800.00,  120,  '明基電通'),
(3,  '2025-06-15 09:00:00+08', '2026-03-15 09:00:00+08', 'EQ-003', '桌上型碎紙機 SH-200C',         '可碎10張，4級保密，15公升紙桶',                     1800.00,  3500.00,  80,   '理想牌事務機'),
(4,  '2025-07-01 09:00:00+08', '2026-02-01 09:00:00+08', 'EQ-004', '商用投影機 PJ-4500',            '4500流明，支援無線投影',                            15000.00, 28000.00, 30,   '愛普生台灣'),
(5,  '2025-07-01 09:00:00+08', '2026-01-15 09:00:00+08', 'EQ-005', '多功能事務機 MF-3800',          '列印/影印/掃描/傳真，A3支援',                       25000.00, 45000.00, 25,   '京瓷辦公設備'),

-- 耗材
(6,  '2025-06-01 09:00:00+08', '2026-03-25 09:00:00+08', 'SP-001', 'A4影印紙 80磅 (5包/箱)',       '白色A4影印紙，每包500張',                           380.00,   650.00,   2000, '永豐餘造紙'),
(7,  '2025-06-01 09:00:00+08', '2026-03-20 09:00:00+08', 'SP-002', '黑色碳粉匣 TK-5200K',          '適用LJ-5200雷射印表機，可印12000頁',                1200.00,  2400.00,  300,  '京瓷辦公設備'),
(8,  '2025-06-01 09:00:00+08', '2026-03-20 09:00:00+08', 'SP-003', '彩色碳粉匣組 TK-5200CMY',      'CMY三色組合，適用LJ-5200，各8000頁',                3500.00,  6800.00,  150,  '京瓷辦公設備'),
(9,  '2025-08-01 09:00:00+08', '2026-03-01 09:00:00+08', 'SP-004', 'A3繪圖紙 100磅 (100張/包)',    '高品質繪圖專用紙',                                  450.00,   850.00,   500,  '永豐餘造紙'),
(10, '2025-08-15 09:00:00+08', '2026-02-15 09:00:00+08', 'SP-005', '裝訂膠圈 10mm (100入)',         '透明塑膠膠圈，適用裝訂機',                           120.00,   250.00,   800,  '利百代文具'),

-- 網路與資安設備
(11, '2025-09-01 09:00:00+08', '2026-03-10 09:00:00+08', 'NT-001', '企業級無線AP WA-6200',         'Wi-Fi 6E 三頻，支援200台裝置同時連線',              8500.00,  15800.00, 60,   '合勤科技'),
(12, '2025-09-01 09:00:00+08', '2026-03-10 09:00:00+08', 'NT-002', '24埠 PoE 交換器 SW-2400P',     'L2管理型，支援PoE+，總供電功率370W',                12000.00, 22500.00, 40,   '合勤科技'),
(13, '2025-09-15 09:00:00+08', '2026-02-20 09:00:00+08', 'NT-003', '企業防火牆 FW-500',             '新世代防火牆，含IPS/IDS，支援VPN 500通道',          35000.00, 65000.00, 15,   '飛塔資安'),
(14, '2025-10-01 09:00:00+08', '2026-03-05 09:00:00+08', 'NT-004', 'Cat.6A 網路線 3米 (10條/包)',   '10Gbps 超六類遮蔽網路線',                           350.00,   680.00,   1500, '大同電線電纜'),
(15, '2025-10-01 09:00:00+08', '2026-01-20 09:00:00+08', 'NT-005', '伺服器機櫃 42U',               '42U標準機櫃，含理線架與電源排插',                   18000.00, 32000.00, 10,   '台達電子'),

-- 軟體授權與服務
(16, '2025-11-01 09:00:00+08', '2026-03-15 09:00:00+08', 'SW-001', 'Office 365 商務版 (年約/人)',   'Microsoft 365 Business Standard，含Teams',          3200.00,  5400.00,  9999, '台灣微軟'),
(17, '2025-11-01 09:00:00+08', '2026-03-15 09:00:00+08', 'SW-002', '防毒軟體企業版 (年約/台)',      '端點偵測與回應 EDR 解決方案',                        800.00,   1500.00,  9999, '趨勢科技'),
(18, '2025-12-01 09:00:00+08', '2026-03-01 09:00:00+08', 'SW-003', 'ERP系統授權 (年約/5人)',        '中小企業 ERP 雲端版，含進銷存、會計模組',            45000.00, 85000.00, 9999, '鼎新電腦'),
(19, '2026-01-15 09:00:00+08', '2026-03-20 09:00:00+08', 'SW-004', '雲端備份服務 1TB (年約)',       '自動排程備份，含異地備援',                           6000.00,  12000.00, 9999, '中華電信'),
(20, '2026-02-01 09:00:00+08', '2026-03-25 09:00:00+08', 'SW-005', '視訊會議系統授權 (年約/間)',    '含硬體借用、雲端錄影、AI會議摘要',                   15000.00, 28000.00, 9999, '訊連科技');

SELECT setval('products_id_seq', 20);

-- ============================================================
-- 報價單（12 筆：4 draft、8 published）
-- 涵蓋各客戶等級、不同報價因子、不同產品組合
-- ============================================================

-- === 已發佈報價單 (published) ===

-- Q1: VIP 客戶大量採購辦公設備 (客戶1, 因子0.75)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(1, '2026-01-15 10:00:00+08', '2026-01-16 09:00:00+08', 'QT-20260115-001', 1, 'vip', 0.7500, 253500.00, 72000.00, 0.2840, 'published', 'VIP年度辦公設備採購案，含安裝與教育訓練');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(1, '2026-01-15 10:00:00+08', '2026-01-15 10:00:00+08', 1, 1,  '商用雷射印表機 LJ-5200',   12000.00, 22000.00, 16500.00, 5,  82500.00),
(2, '2026-01-15 10:00:00+08', '2026-01-15 10:00:00+08', 1, 2,  '27吋商用液晶螢幕 M27-Pro', 5500.00,  9800.00,  7350.00,  20, 147000.00),
(3, '2026-01-15 10:00:00+08', '2026-01-15 10:00:00+08', 1, 3,  '桌上型碎紙機 SH-200C',     1800.00,  3500.00,  2625.00,  4,  10500.00),
(4, '2026-01-15 10:00:00+08', '2026-01-15 10:00:00+08', 1, 6,  'A4影印紙 80磅 (5包/箱)',   380.00,   650.00,   487.50,   20, 9750.00),
(5, '2026-01-15 10:00:00+08', '2026-01-15 10:00:00+08', 1, 7,  '黑色碳粉匣 TK-5200K',     1200.00,  2400.00,  1800.00,  2,  3600.00),
(6, '2026-01-15 10:00:00+08', '2026-01-15 10:00:00+08', 1, 16, 'Office 365 商務版 (年約/人)', 3200.00, 5400.00, 4050.00,  0,  0.00);
-- 修正: 移除數量為0的項目，重新計算
DELETE FROM quotation_items WHERE id = 6;

-- Q2: VIP 客戶網路設備升級 (客戶2, 因子0.78)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(2, '2026-01-20 14:30:00+08', '2026-01-22 10:00:00+08', 'QT-20260120-001', 2, 'vip', 0.7800, 271830.00, 82280.00, 0.3027, 'published', '全廠區網路設備升級案');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(7,  '2026-01-20 14:30:00+08', '2026-01-20 14:30:00+08', 2, 11, '企業級無線AP WA-6200',       8500.00,  15800.00, 12324.00, 10, 123240.00),
(8,  '2026-01-20 14:30:00+08', '2026-01-20 14:30:00+08', 2, 12, '24埠 PoE 交換器 SW-2400P',   12000.00, 22500.00, 17550.00, 3,  52650.00),
(9,  '2026-01-20 14:30:00+08', '2026-01-20 14:30:00+08', 2, 13, '企業防火牆 FW-500',           35000.00, 65000.00, 50700.00, 1,  50700.00),
(10, '2026-01-20 14:30:00+08', '2026-01-20 14:30:00+08', 2, 14, 'Cat.6A 網路線 3米 (10條/包)', 350.00,   680.00,   530.40,   50, 26520.00),
(11, '2026-01-20 14:30:00+08', '2026-01-20 14:30:00+08', 2, 15, '伺服器機櫃 42U',             18000.00, 32000.00, 24960.00, 1,  24960.00);
-- 重算: total=123240+52650+50700+26520+24960=278070, profit=(12324-8500)*10+(17550-12000)*3+(50700-35000)*1+(530.40-350)*50+(24960-18000)*1
-- 修正 totals
UPDATE quotations SET total_price = 278070.00, profit_amount = 82120.00, profit_rate = 0.2953 WHERE id = 2;

-- Q3: Standard 客戶軟體採購 (客戶6, 因子0.88)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(3, '2026-02-05 09:30:00+08', '2026-02-06 14:00:00+08', 'QT-20260205-001', 6, 'standard', 0.8800, 246400.00, 84400.00, 0.3426, 'published', '年度軟體授權續約與新增');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(12, '2026-02-05 09:30:00+08', '2026-02-05 09:30:00+08', 3, 16, 'Office 365 商務版 (年約/人)',    3200.00,  5400.00,  4752.00,  30, 142560.00),
(13, '2026-02-05 09:30:00+08', '2026-02-05 09:30:00+08', 3, 17, '防毒軟體企業版 (年約/台)',       800.00,   1500.00,  1320.00,  30, 39600.00),
(14, '2026-02-05 09:30:00+08', '2026-02-05 09:30:00+08', 3, 18, 'ERP系統授權 (年約/5人)',         45000.00, 85000.00, 74800.00, 1,  74800.00);
-- total=142560+39600+74800=256960, profit=(4752-3200)*30+(1320-800)*30+(74800-45000)*1=46560+15600+29800=91960
UPDATE quotations SET total_price = 256960.00, profit_amount = 91960.00, profit_rate = 0.3578 WHERE id = 3;

-- Q4: VIP 客戶耗材定期採購 (客戶3, 因子0.80)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(4, '2026-02-10 11:00:00+08', '2026-02-11 09:30:00+08', 'QT-20260210-001', 3, 'vip', 0.8000, 69360.00, 21360.00, 0.3080, 'published', '每季耗材定期採購 - Q1');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(15, '2026-02-10 11:00:00+08', '2026-02-10 11:00:00+08', 4, 6,  'A4影印紙 80磅 (5包/箱)',       380.00,  650.00,  520.00,   50,  26000.00),
(16, '2026-02-10 11:00:00+08', '2026-02-10 11:00:00+08', 4, 7,  '黑色碳粉匣 TK-5200K',         1200.00, 2400.00, 1920.00,  10,  19200.00),
(17, '2026-02-10 11:00:00+08', '2026-02-10 11:00:00+08', 4, 8,  '彩色碳粉匣組 TK-5200CMY',     3500.00, 6800.00, 5440.00,  3,   16320.00),
(18, '2026-02-10 11:00:00+08', '2026-02-10 11:00:00+08', 4, 9,  'A3繪圖紙 100磅 (100張/包)',   450.00,  850.00,  680.00,   10,  6800.00),
(19, '2026-02-10 11:00:00+08', '2026-02-10 11:00:00+08', 4, 10, '裝訂膠圈 10mm (100入)',        120.00,  250.00,  200.00,   5,   1000.00);
-- total=26000+19200+16320+6800+1000=69320
UPDATE quotations SET total_price = 69320.00, profit_amount = 21320.00, profit_rate = 0.3076 WHERE id = 4;

-- Q5: Standard 客戶辦公設備 (客戶7, 因子0.90)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(5, '2026-02-18 15:00:00+08', '2026-02-20 10:00:00+08', 'QT-20260218-001', 7, 'standard', 0.9000, 135450.00, 39450.00, 0.2913, 'published', '新辦公室設備採購');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(20, '2026-02-18 15:00:00+08', '2026-02-18 15:00:00+08', 5, 1,  '商用雷射印表機 LJ-5200',   12000.00, 22000.00, 19800.00, 2,  39600.00),
(21, '2026-02-18 15:00:00+08', '2026-02-18 15:00:00+08', 5, 2,  '27吋商用液晶螢幕 M27-Pro', 5500.00,  9800.00,  8820.00,  10, 88200.00),
(22, '2026-02-18 15:00:00+08', '2026-02-18 15:00:00+08', 5, 3,  '桌上型碎紙機 SH-200C',     1800.00,  3500.00,  3150.00,  2,  6300.00),
(23, '2026-02-18 15:00:00+08', '2026-02-18 15:00:00+08', 5, 10, '裝訂膠圈 10mm (100入)',     120.00,   250.00,   225.00,   6,  1350.00);
UPDATE quotations SET total_price = 135450.00, profit_amount = 39450.00, profit_rate = 0.2913 WHERE id = 5;

-- Q6: New 客戶首次採購 (客戶12, 因子1.00)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(6, '2026-03-01 10:00:00+08', '2026-03-02 11:30:00+08', 'QT-20260301-001', 12, 'new', 1.0000, 112400.00, 49600.00, 0.4413, 'published', '新客戶首次採購，標準價格');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(24, '2026-03-01 10:00:00+08', '2026-03-01 10:00:00+08', 6, 5,  '多功能事務機 MF-3800',         25000.00, 45000.00, 45000.00, 1,  45000.00),
(25, '2026-03-01 10:00:00+08', '2026-03-01 10:00:00+08', 6, 16, 'Office 365 商務版 (年約/人)',   3200.00,  5400.00,  5400.00,  10, 54000.00),
(26, '2026-03-01 10:00:00+08', '2026-03-01 10:00:00+08', 6, 17, '防毒軟體企業版 (年約/台)',      800.00,   1500.00,  1500.00,  10, 15000.00);
-- total=45000+54000+15000=114000, profit=(45000-25000)*1+(5400-3200)*10+(1500-800)*10=20000+22000+7000=49000
UPDATE quotations SET total_price = 114000.00, profit_amount = 49000.00, profit_rate = 0.4298 WHERE id = 6;

-- Q7: VIP 客戶視訊會議解決方案 (客戶4, 因子0.76)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(7, '2026-03-05 14:00:00+08', '2026-03-06 16:00:00+08', 'QT-20260305-001', 4, 'vip', 0.7600, 190000.00, 55000.00, 0.2895, 'published', '全公司視訊會議系統建置');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(27, '2026-03-05 14:00:00+08', '2026-03-05 14:00:00+08', 7, 20, '視訊會議系統授權 (年約/間)',    15000.00, 28000.00, 21280.00, 5,  106400.00),
(28, '2026-03-05 14:00:00+08', '2026-03-05 14:00:00+08', 7, 4,  '商用投影機 PJ-4500',           15000.00, 28000.00, 21280.00, 3,  63840.00),
(29, '2026-03-05 14:00:00+08', '2026-03-05 14:30:00+08', 7, 11, '企業級無線AP WA-6200',         8500.00,  15800.00, 12008.00, 2,  24016.00);
-- total=106400+63840+24016=194256, profit=(21280-15000)*5+(21280-15000)*3+(12008-8500)*2=31400+18840+7016=57256
UPDATE quotations SET total_price = 194256.00, profit_amount = 57256.00, profit_rate = 0.2948 WHERE id = 7;

-- Q8: Standard 客戶雲端服務 (客戶9, 因子0.92)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(8, '2026-03-10 09:00:00+08', '2026-03-11 10:30:00+08', 'QT-20260310-001', 9, 'standard', 0.9200, 123280.00, 40280.00, 0.3268, 'published', '雲端服務年度合約');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(30, '2026-03-10 09:00:00+08', '2026-03-10 09:00:00+08', 8, 19, '雲端備份服務 1TB (年約)',       6000.00,  12000.00, 11040.00, 5,  55200.00),
(31, '2026-03-10 09:00:00+08', '2026-03-10 09:00:00+08', 8, 16, 'Office 365 商務版 (年約/人)',   3200.00,  5400.00,  4968.00,  10, 49680.00),
(32, '2026-03-10 09:00:00+08', '2026-03-10 09:00:00+08', 8, 17, '防毒軟體企業版 (年約/台)',      800.00,   1500.00,  1380.00,  10, 13800.00);
-- total=55200+49680+13800=118680, profit=(11040-6000)*5+(4968-3200)*10+(1380-800)*10=25200+17680+5800=48680
UPDATE quotations SET total_price = 118680.00, profit_amount = 48680.00, profit_rate = 0.4102 WHERE id = 8;

-- === 草稿報價單 (draft) - 供 E2E 測試修改/發佈/刪除 ===

-- Q9: 草稿 - VIP客戶待確認 (客戶5, 因子0.82)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(9, '2026-03-25 10:00:00+08', '2026-03-25 10:00:00+08', 'QT-20260325-001', 5, 'vip', 0.8200, 0, 0, 0, 'draft', '待客戶確認的設備報價');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(33, '2026-03-25 10:00:00+08', '2026-03-25 10:00:00+08', 9, 1,  '商用雷射印表機 LJ-5200',       12000.00, 22000.00, 18040.00, 3, 54120.00),
(34, '2026-03-25 10:00:00+08', '2026-03-25 10:00:00+08', 9, 5,  '多功能事務機 MF-3800',          25000.00, 45000.00, 36900.00, 1, 36900.00),
(35, '2026-03-25 10:00:00+08', '2026-03-25 10:00:00+08', 9, 2,  '27吋商用液晶螢幕 M27-Pro',     5500.00,  9800.00,  8036.00,  15, 120540.00);
UPDATE quotations SET total_price = 211560.00, profit_amount = 66060.00, profit_rate = 0.3123 WHERE id = 9;

-- Q10: 草稿 - Standard客戶網路採購 (客戶8, 因子0.90)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(10, '2026-03-26 14:00:00+08', '2026-03-26 14:00:00+08', 'QT-20260326-001', 8, 'standard', 0.9000, 0, 0, 0, 'draft', '新辦公室網路建置報價');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(36, '2026-03-26 14:00:00+08', '2026-03-26 14:00:00+08', 10, 11, '企業級無線AP WA-6200',       8500.00,  15800.00, 14220.00, 5,  71100.00),
(37, '2026-03-26 14:00:00+08', '2026-03-26 14:00:00+08', 10, 12, '24埠 PoE 交換器 SW-2400P',   12000.00, 22500.00, 20250.00, 2,  40500.00),
(38, '2026-03-26 14:00:00+08', '2026-03-26 14:30:00+08', 10, 14, 'Cat.6A 網路線 3米 (10條/包)', 350.00,   680.00,   612.00,   30, 18360.00);
UPDATE quotations SET total_price = 129960.00, profit_amount = 39960.00, profit_rate = 0.3075 WHERE id = 10;

-- Q11: 草稿 - New客戶小型採購 (客戶13, 因子1.00)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(11, '2026-03-28 09:30:00+08', '2026-03-28 09:30:00+08', 'QT-20260328-001', 13, 'new', 1.0000, 0, 0, 0, 'draft', 'IoT開發環境建置');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(39, '2026-03-28 09:30:00+08', '2026-03-28 09:30:00+08', 11, 2,  '27吋商用液晶螢幕 M27-Pro',  5500.00, 9800.00,  9800.00,  5,  49000.00),
(40, '2026-03-28 09:30:00+08', '2026-03-28 09:30:00+08', 11, 16, 'Office 365 商務版 (年約/人)', 3200.00, 5400.00,  5400.00,  5,  27000.00),
(41, '2026-03-28 09:30:00+08', '2026-03-28 09:30:00+08', 11, 19, '雲端備份服務 1TB (年約)',     6000.00, 12000.00, 12000.00, 1,  12000.00);
UPDATE quotations SET total_price = 88000.00, profit_amount = 33000.00, profit_rate = 0.3750 WHERE id = 11;

-- Q12: 草稿 - 即將刪除用 (客戶14, 因子0.95)
INSERT INTO quotations (id, created_at, updated_at, quotation_number, customer_id, customer_level, pricing_factor, total_price, profit_amount, profit_rate, status, notes) VALUES
(12, '2026-03-30 16:00:00+08', '2026-03-30 16:00:00+08', 'QT-20260330-001', 14, 'new', 0.9500, 0, 0, 0, 'draft', '測試用草稿 - 可供刪除測試');
INSERT INTO quotation_items (id, created_at, updated_at, quotation_id, product_id, product_name, product_cost, list_price, unit_price, quantity, subtotal) VALUES
(42, '2026-03-30 16:00:00+08', '2026-03-30 16:00:00+08', 12, 6, 'A4影印紙 80磅 (5包/箱)', 380.00, 650.00, 617.50, 10, 6175.00);
UPDATE quotations SET total_price = 6175.00, profit_amount = 2375.00, profit_rate = 0.3846 WHERE id = 12;

SELECT setval('quotations_id_seq', 12);
SELECT setval('quotation_items_id_seq', 42);

-- ============================================================
-- 訂單（10 筆：3 pending、3 confirmed、2 completed、2 cancelled）
-- 部分關聯報價單，部分獨立建立
-- ============================================================

-- O1: 已完成 - 對應 Q1 (客戶1)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(1, '2026-01-18 09:00:00+08', '2026-02-28 10:00:00+08', 'ORD-20260118-001', 1, 1, 253350.00, 'completed', '已完成交貨與驗收');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(1, '2026-01-18 09:00:00+08', '2026-01-18 09:00:00+08', 1, 1,  '商用雷射印表機 LJ-5200',   16500.00, 5,  82500.00),
(2, '2026-01-18 09:00:00+08', '2026-01-18 09:00:00+08', 1, 2,  '27吋商用液晶螢幕 M27-Pro', 7350.00,  20, 147000.00),
(3, '2026-01-18 09:00:00+08', '2026-01-18 09:00:00+08', 1, 3,  '桌上型碎紙機 SH-200C',     2625.00,  4,  10500.00),
(4, '2026-01-18 09:00:00+08', '2026-01-18 09:00:00+08', 1, 6,  'A4影印紙 80磅 (5包/箱)',   487.50,   20, 9750.00),
(5, '2026-01-18 09:00:00+08', '2026-01-18 09:00:00+08', 1, 7,  '黑色碳粉匣 TK-5200K',     1800.00,  2,  3600.00);

-- O2: 已完成 - 對應 Q4 耗材 (客戶3)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(2, '2026-02-12 10:00:00+08', '2026-03-15 14:00:00+08', 'ORD-20260212-001', 3, 4, 69320.00, 'completed', 'Q1耗材已全數到貨');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(6,  '2026-02-12 10:00:00+08', '2026-02-12 10:00:00+08', 2, 6,  'A4影印紙 80磅 (5包/箱)',      520.00,  50, 26000.00),
(7,  '2026-02-12 10:00:00+08', '2026-02-12 10:00:00+08', 2, 7,  '黑色碳粉匣 TK-5200K',        1920.00, 10, 19200.00),
(8,  '2026-02-12 10:00:00+08', '2026-02-12 10:00:00+08', 2, 8,  '彩色碳粉匣組 TK-5200CMY',    5440.00, 3,  16320.00),
(9,  '2026-02-12 10:00:00+08', '2026-02-12 10:00:00+08', 2, 9,  'A3繪圖紙 100磅 (100張/包)',  680.00,  10, 6800.00),
(10, '2026-02-12 10:00:00+08', '2026-02-12 10:00:00+08', 2, 10, '裝訂膠圈 10mm (100入)',       200.00,  5,  1000.00);

-- O3: 已確認 - 對應 Q2 網路設備 (客戶2)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(3, '2026-01-25 14:00:00+08', '2026-03-20 09:00:00+08', 'ORD-20260125-001', 2, 2, 278070.00, 'confirmed', '已確認，排定下週安裝');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(11, '2026-01-25 14:00:00+08', '2026-01-25 14:00:00+08', 3, 11, '企業級無線AP WA-6200',       12324.00, 10, 123240.00),
(12, '2026-01-25 14:00:00+08', '2026-01-25 14:00:00+08', 3, 12, '24埠 PoE 交換器 SW-2400P',   17550.00, 3,  52650.00),
(13, '2026-01-25 14:00:00+08', '2026-01-25 14:00:00+08', 3, 13, '企業防火牆 FW-500',           50700.00, 1,  50700.00),
(14, '2026-01-25 14:00:00+08', '2026-01-25 14:00:00+08', 3, 14, 'Cat.6A 網路線 3米 (10條/包)', 530.40,   50, 26520.00),
(15, '2026-01-25 14:00:00+08', '2026-01-25 14:00:00+08', 3, 15, '伺服器機櫃 42U',             24960.00, 1,  24960.00);

-- O4: 已確認 - 對應 Q3 軟體 (客戶6)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(4, '2026-02-08 10:00:00+08', '2026-03-18 11:00:00+08', 'ORD-20260208-001', 6, 3, 256960.00, 'confirmed', '軟體授權啟用中');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(16, '2026-02-08 10:00:00+08', '2026-02-08 10:00:00+08', 4, 16, 'Office 365 商務版 (年約/人)', 4752.00,  30, 142560.00),
(17, '2026-02-08 10:00:00+08', '2026-02-08 10:00:00+08', 4, 17, '防毒軟體企業版 (年約/台)',    1320.00,  30, 39600.00),
(18, '2026-02-08 10:00:00+08', '2026-02-08 10:00:00+08', 4, 18, 'ERP系統授權 (年約/5人)',      74800.00, 1,  74800.00);

-- O5: 已確認 - 對應 Q7 視訊會議 (客戶4)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(5, '2026-03-08 09:30:00+08', '2026-03-25 14:00:00+08', 'ORD-20260308-001', 4, 7, 194256.00, 'confirmed', '設備已下單，預計兩週到貨');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(19, '2026-03-08 09:30:00+08', '2026-03-08 09:30:00+08', 5, 20, '視訊會議系統授權 (年約/間)', 21280.00, 5, 106400.00),
(20, '2026-03-08 09:30:00+08', '2026-03-08 09:30:00+08', 5, 4,  '商用投影機 PJ-4500',        21280.00, 3, 63840.00),
(21, '2026-03-08 09:30:00+08', '2026-03-08 09:30:00+08', 5, 11, '企業級無線AP WA-6200',      12008.00, 2, 24016.00);

-- O6: 待處理 - 對應 Q5 (客戶7)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(6, '2026-03-22 11:00:00+08', '2026-03-22 11:00:00+08', 'ORD-20260322-001', 7, 5, 135450.00, 'pending', '等待採購主管核准');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(22, '2026-03-22 11:00:00+08', '2026-03-22 11:00:00+08', 6, 1,  '商用雷射印表機 LJ-5200',   19800.00, 2,  39600.00),
(23, '2026-03-22 11:00:00+08', '2026-03-22 11:00:00+08', 6, 2,  '27吋商用液晶螢幕 M27-Pro', 8820.00,  10, 88200.00),
(24, '2026-03-22 11:00:00+08', '2026-03-22 11:00:00+08', 6, 3,  '桌上型碎紙機 SH-200C',     3150.00,  2,  6300.00),
(25, '2026-03-22 11:00:00+08', '2026-03-22 11:00:00+08', 6, 10, '裝訂膠圈 10mm (100入)',     225.00,   6,  1350.00);

-- O7: 待處理 - 對應 Q8 雲端服務 (客戶9)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(7, '2026-03-25 15:00:00+08', '2026-03-25 15:00:00+08', 'ORD-20260325-001', 9, 8, 118680.00, 'pending', '待財務確認付款方式');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(26, '2026-03-25 15:00:00+08', '2026-03-25 15:00:00+08', 7, 19, '雲端備份服務 1TB (年約)',     11040.00, 5,  55200.00),
(27, '2026-03-25 15:00:00+08', '2026-03-25 15:00:00+08', 7, 16, 'Office 365 商務版 (年約/人)', 4968.00,  10, 49680.00),
(28, '2026-03-25 15:00:00+08', '2026-03-25 15:00:00+08', 7, 17, '防毒軟體企業版 (年約/台)',    1380.00,  10, 13800.00);

-- O8: 待處理 - 獨立建立不關聯報價單 (客戶10)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(8, '2026-03-28 09:00:00+08', '2026-03-28 09:00:00+08', 'ORD-20260328-001', 10, NULL, 32500.00, 'pending', '急單 - 直接下訂不走報價');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(29, '2026-03-28 09:00:00+08', '2026-03-28 09:00:00+08', 8, 6,  'A4影印紙 80磅 (5包/箱)',   650.00,  50, 32500.00);

-- O9: 已取消 - 客戶取消 (客戶11)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(9, '2026-02-25 10:00:00+08', '2026-03-05 09:00:00+08', 'ORD-20260225-001', 11, NULL, 45000.00, 'cancelled', '客戶預算凍結，取消訂單');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(30, '2026-02-25 10:00:00+08', '2026-02-25 10:00:00+08', 9, 5, '多功能事務機 MF-3800', 45000.00, 1, 45000.00);

-- O10: 已取消 - 改用其他供應商 (客戶15)
INSERT INTO orders (id, created_at, updated_at, order_number, customer_id, quotation_id, total_price, status, notes) VALUES
(10, '2026-03-15 14:00:00+08', '2026-03-20 16:30:00+08', 'ORD-20260315-001', 15, NULL, 9800.00, 'cancelled', '客戶改向其他供應商採購');
INSERT INTO order_items (id, created_at, updated_at, order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(31, '2026-03-15 14:00:00+08', '2026-03-15 14:00:00+08', 10, 2, '27吋商用液晶螢幕 M27-Pro', 9800.00, 1, 9800.00);

SELECT setval('orders_id_seq', 10);
SELECT setval('order_items_id_seq', 31);

COMMIT;

-- ============================================================
-- 驗證資料
-- ============================================================
\echo '=== 資料集載入完成 ==='
\echo ''
SELECT '客戶' AS entity, count(*) AS total, string_agg(DISTINCT level, ', ') AS detail FROM customers WHERE deleted_at IS NULL
UNION ALL
SELECT '產品', count(*), string_agg(DISTINCT supplier, ', ') FROM products WHERE deleted_at IS NULL
UNION ALL
SELECT '報價單', count(*), string_agg(DISTINCT status, ', ') FROM quotations WHERE deleted_at IS NULL
UNION ALL
SELECT '報價明細', count(*), '' FROM quotation_items WHERE deleted_at IS NULL
UNION ALL
SELECT '訂單', count(*), string_agg(DISTINCT status, ', ') FROM orders WHERE deleted_at IS NULL
UNION ALL
SELECT '訂單明細', count(*), '' FROM order_items WHERE deleted_at IS NULL
ORDER BY entity;
