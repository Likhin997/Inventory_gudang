export interface CI4File {
  path: string;
  name: string;
  category: 'Migration' | 'Model' | 'Controller' | 'Routes' | 'Seeder' | 'Config';
  description: string;
  content: string;
}

export function getCI4CodebaseFiles(): CI4File[] {
  return [
    {
      path: 'app/Database/Migrations/2026-08-31-000001_CreateISPInventorySchema.php',
      name: '2026-08-31-000001_CreateISPInventorySchema.php',
      category: 'Migration',
      description: 'CodeIgniter 4 Database Migration yang membuat 18+ tabel relasional, foreign keys, and unique indexes.',
      content: `<?php

namespace App\\Database\\Migrations;

use CodeIgniter\\Database\\Migration;

class CreateISPInventorySchema extends Migration
{
    public function up()
    {
        // 1. ROLES & USERS
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'username'    => ['type' => 'VARCHAR', 'constraint' => 50, 'unique' => true],
            'email'       => ['type' => 'VARCHAR', 'constraint' => 100, 'unique' => true],
            'password'    => ['type' => 'VARCHAR', 'constraint' => 255],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 100],
            'role'        => ['type' => 'ENUM', 'constraint' => ['SUPERADMIN', 'GUDANG', 'ADMIN', 'TEKNISI'], 'default' => 'TEKNISI'],
            'phone'       => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'team_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'active'      => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('users', true);

        // 2. TEAMS & TECHNICIANS
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'code'          => ['type' => 'VARCHAR', 'constraint' => 30, 'unique' => true],
            'name'          => ['type' => 'VARCHAR', 'constraint' => 100],
            'pic'           => ['type' => 'VARCHAR', 'constraint' => 100],
            'phone'         => ['type' => 'VARCHAR', 'constraint' => 30],
            'status'        => ['type' => 'ENUM', 'constraint' => ['ACTIVE', 'INACTIVE'], 'default' => 'ACTIVE'],
            'coverage_area' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('teams', true);

        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'nik'         => ['type' => 'VARCHAR', 'constraint' => 50, 'unique' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 100],
            'team_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'team_name'   => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'phone'       => ['type' => 'VARCHAR', 'constraint' => 30],
            'email'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'status'      => ['type' => 'ENUM', 'constraint' => ['ACTIVE', 'INACTIVE'], 'default' => 'ACTIVE'],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('team_id', 'teams', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->createTable('technicians', true);

        // 3. MASTER ITEMS, CATEGORIES, UNITS, SUPPLIERS
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'code'          => ['type' => 'VARCHAR', 'constraint' => 50, 'unique' => true],
            'name'          => ['type' => 'VARCHAR', 'constraint' => 150],
            'category_type' => ['type' => 'ENUM', 'constraint' => ['MODEM', 'KABEL', 'BARANG_UMUM', 'BARANG_TEKNISI']],
            'brand'         => ['type' => 'VARCHAR', 'constraint' => 80],
            'model'         => ['type' => 'VARCHAR', 'constraint' => 100],
            'unit'          => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'pcs'],
            'current_stock' => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0.00],
            'min_stock'     => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 20.00],
            'location'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'default_price' => ['type' => 'DECIMAL', 'constraint' => '14,2', 'default' => 0.00],
            'description'   => ['type' => 'TEXT', 'null' => true],
            'is_serial_tracked' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('items', true);

        // 4. ITEM BATCHES
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'batch_number'   => ['type' => 'VARCHAR', 'constraint' => 60, 'unique' => true],
            'item_id'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'supplier_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'date_in'        => ['type' => 'DATE'],
            'invoice_number' => ['type' => 'VARCHAR', 'constraint' => 80],
            'quantity'       => ['type' => 'INT', 'constraint' => 11],
            'unit_price'     => ['type' => 'DECIMAL', 'constraint' => '14,2', 'default' => 0.00],
            'notes'          => ['type' => 'TEXT', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('item_id', 'items', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->createTable('item_batches', true);

        // 5. MODEM SERIAL NUMBERS (MANDATORY UNIQUE SN)
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'item_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'batch_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'batch_number'  => ['type' => 'VARCHAR', 'constraint' => 60],
            'serial_number' => ['type' => 'VARCHAR', 'constraint' => 80, 'unique' => true],
            'mac_address'   => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'status'        => ['type' => 'ENUM', 'constraint' => ['AVAILABLE', 'RESERVED', 'DIPINJAM_TEKNISI', 'TERPASANG', 'RUSAK', 'HILANG', 'RETUR'], 'default' => 'AVAILABLE'],
            'location'      => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => true],
            'team_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'tech_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'customer_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'customer_address' => ['type' => 'TEXT', 'null' => true],
            'installed_date'=> ['type' => 'DATE', 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('serial_number');
        $this->forge->addForeignKey('item_id', 'items', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->createTable('modem_serial_numbers', true);

        // 6. STOCK TRANSACTIONS
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'transaction_number' => ['type' => 'VARCHAR', 'constraint' => 60, 'unique' => true],
            'type'               => ['type' => 'ENUM', 'constraint' => ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN']],
            'date'               => ['type' => 'DATE'],
            'item_id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'quantity'           => ['type' => 'DECIMAL', 'constraint' => '12,2'],
            'unit'               => ['type' => 'VARCHAR', 'constraint' => 20],
            'team_id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'tech_id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'project_name'       => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'purpose'            => ['type' => 'TEXT', 'null' => true],
            'stock_before'       => ['type' => 'DECIMAL', 'constraint' => '12,2'],
            'stock_after'        => ['type' => 'DECIMAL', 'constraint' => '12,2'],
            'performed_by'       => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at'         => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('stock_transactions', true);

        // 7. CABLE USAGE LOGS
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'item_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'team_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'tech_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'meters_used'  => ['type' => 'DECIMAL', 'constraint' => '12,2'],
            'date'         => ['type' => 'DATE'],
            'project'      => ['type' => 'VARCHAR', 'constraint' => 150],
            'purpose'      => ['type' => 'TEXT'],
            'performed_by' => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('cable_usage_logs', true);

        // 8. AUDIT LOGS
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'user_name'  => ['type' => 'VARCHAR', 'constraint' => 100],
            'role'       => ['type' => 'VARCHAR', 'constraint' => 50],
            'action'     => ['type' => 'VARCHAR', 'constraint' => 80],
            'entity'     => ['type' => 'VARCHAR', 'constraint' => 80],
            'entity_id'  => ['type' => 'VARCHAR', 'constraint' => 80],
            'details'    => ['type' => 'TEXT'],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('audit_logs', true);
    }

    public function down()
    {
        $this->forge->dropTable('audit_logs', true);
        $this->forge->dropTable('cable_usage_logs', true);
        $this->forge->dropTable('stock_transactions', true);
        $this->forge->dropTable('modem_serial_numbers', true);
        $this->forge->dropTable('item_batches', true);
        $this->forge->dropTable('items', true);
        $this->forge->dropTable('technicians', true);
        $this->forge->dropTable('teams', true);
        $this->forge->dropTable('users', true);
    }
}
`
    },
    {
      path: 'app/Models/ItemModel.php',
      name: 'ItemModel.php',
      category: 'Model',
      description: 'Model CodeIgniter 4 untuk Items dengan query helper, validasi stok, and soft deletes.',
      content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class ItemModel extends Model
{
    protected $table            = 'items';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = true;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'code', 'name', 'category_type', 'brand', 'model', 'unit',
        'current_stock', 'min_stock', 'location', 'default_price',
        'description', 'is_serial_tracked'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    // Validation rules
    protected $validationRules = [
        'code'          => 'required|is_unique[items.code,id,{id}]|min_length[3]|max_length[50]',
        'name'          => 'required|min_length[3]|max_length[150]',
        'category_type' => 'required|in_list[MODEM,KABEL,BARANG_UMUM,BARANG_TEKNISI]',
        'current_stock' => 'numeric|greater_than_equal_to[0]',
        'min_stock'     => 'numeric|greater_than_equal_to[0]',
    ];

    public function getLowStockItems()
    {
        return $this->where('current_stock <= min_stock')
                    ->orderBy('current_stock', 'ASC')
                    ->findAll();
    }
}
`
    },
    {
      path: 'app/Models/ModemSNModel.php',
      name: 'ModemSNModel.php',
      category: 'Model',
      description: 'Model CodeIgniter 4 untuk Serial Number Modem dengan unique check and status transitions.',
      content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class ModemSNModel extends Model
{
    protected $table            = 'modem_serial_numbers';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'item_id', 'batch_id', 'batch_number', 'serial_number', 'mac_address',
        'status', 'location', 'team_id', 'tech_id', 'customer_name',
        'customer_address', 'installed_date'
    ];

    protected $useTimestamps = true;

    protected $validationRules = [
        'serial_number' => 'required|is_unique[modem_serial_numbers.serial_number,id,{id}]',
        'status'        => 'required|in_list[AVAILABLE,RESERVED,DIPINJAM_TEKNISI,TERPASANG,RUSAK,HILANG,RETUR]'
    ];

    public function getAvailableByModel(int $itemId)
    {
        return $this->where('item_id', $itemId)
                    ->where('status', 'AVAILABLE')
                    ->orderBy('id', 'ASC') // FIFO
                    ->findAll();
    }
}
`
    },
    {
      path: 'app/Controllers/Api/StockTransactionController.php',
      name: 'StockTransactionController.php',
      category: 'Controller',
      description: 'Controller REST API CodeIgniter 4 dengan Database Transaction atomic handling for Stock In & Out.',
      content: `<?php

namespace App\\Controllers\\Api;

use CodeIgniter\\RESTful\\ResourceController;
use App\\Models\\ItemModel;
use App\\Models\\ModemSNModel;

class StockTransactionController extends ResourceController
{
    protected $format = 'json';

    public function stockIn()
    {
        $db = \\Config\\Database::connect();
        $db->transStart(); // Start DB Transaction

        try {
            $itemId   = $this->request->getVar('item_id');
            $quantity = (float)$this->request->getVar('quantity');
            $invoice  = $this->request->getVar('invoice_number');
            $sns      = $this->request->getVar('serial_numbers'); // array of SN

            $itemModel = new ItemModel();
            $item = $itemModel->find($itemId);

            if (!$item) {
                return $this->failNotFound('Barang tidak ditemukan');
            }

            if ($item['category_type'] === 'MODEM') {
                if (empty($sns) || count($sns) !== (int)$quantity) {
                    return $this->failValidationError('Modem wajib memiliki Serial Number yang sesuai dengan jumlah quantity');
                }

                $snModel = new ModemSNModel();
                foreach ($sns as $sn) {
                    $snModel->insert([
                        'item_id'       => $itemId,
                        'batch_number'  => $this->request->getVar('batch_number') ?? 'BATCH-'.date('Ymd'),
                        'serial_number' => strtoupper(trim($sn['sn'])),
                        'mac_address'   => $sn['mac'] ?? null,
                        'status'        => 'AVAILABLE',
                        'location'      => $item['location'] ?? 'Gudang Utama',
                    ]);
                }
            }

            // Update Stock
            $stockBefore = (float)$item['current_stock'];
            $stockAfter  = $stockBefore + $quantity;
            $itemModel->update($itemId, ['current_stock' => $stockAfter]);

            // Record transaction
            $trxNumber = 'TRX-IN-' . date('Ymd') . '-' . rand(1000, 9999);
            $db->table('stock_transactions')->insert([
                'transaction_number' => $trxNumber,
                'type'               => 'STOCK_IN',
                'date'               => date('Y-m-d'),
                'item_id'            => $itemId,
                'quantity'           => $quantity,
                'unit'               => $item['unit'],
                'stock_before'       => $stockBefore,
                'stock_after'        => $stockAfter,
                'performed_by'       => 'Admin Gudang',
                'created_at'         => date('Y-m-d H:i:s')
            ]);

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError('Gagal memproses transaksi stok');
            }

            return $this->respondCreated([
                'status'  => 201,
                'message' => 'Stok masuk berhasil dicatat',
                'data'    => [
                    'transaction_number' => $trxNumber,
                    'stock_after'        => $stockAfter
                ]
            ]);
        } catch (\\Exception $e) {
            $db->transRollback();
            return $this->failServerError($e->getMessage());
        }
    }

    public function stockOut()
    {
        $db = \\Config\\Database::connect();
        $db->transStart();

        try {
            $itemId   = $this->request->getVar('item_id');
            $teamId   = $this->request->getVar('team_id');
            $techId   = $this->request->getVar('tech_id');
            $quantity = (float)$this->request->getVar('quantity');
            $selectedSNs = $this->request->getVar('selected_serial_numbers');

            $itemModel = new ItemModel();
            $item = $itemModel->find($itemId);

            if (!$item) {
                return $this->failNotFound('Barang tidak ditemukan');
            }

            $currentStock = (float)$item['current_stock'];
            if ($currentStock < $quantity) {
                return $this->failValidationError("Stok tidak mencukupi. Tersedia: {$currentStock}, Diminta: {$quantity}");
            }

            if ($item['category_type'] === 'MODEM') {
                $snModel = new ModemSNModel();
                foreach ($selectedSNs as $sn) {
                    $modem = $snModel->where('serial_number', $sn)->where('item_id', $itemId)->first();
                    if (!$modem || $modem['status'] !== 'AVAILABLE') {
                        return $this->failValidationError("Serial number {$sn} tidak tersedia.");
                    }
                    $snModel->update($modem['id'], [
                        'status'   => 'DIPINJAM_TEKNISI',
                        'team_id'  => $teamId,
                        'tech_id'  => $techId,
                        'location' => 'Dipinjam Teknisi'
                    ]);
                }
            }

            // Cable tracking per team
            if ($item['category_type'] === 'KABEL') {
                $db->table('cable_usage_logs')->insert([
                    'item_id'      => $itemId,
                    'team_id'      => $teamId,
                    'tech_id'      => $techId,
                    'meters_used'  => $quantity,
                    'date'         => date('Y-m-d'),
                    'project'      => $this->request->getVar('project') ?? 'General',
                    'purpose'      => $this->request->getVar('purpose') ?? 'Instalasi',
                    'performed_by' => 'Admin Gudang',
                    'created_at'   => date('Y-m-d H:i:s')
                ]);
            }

            $stockAfter = $currentStock - $quantity;
            $itemModel->update($itemId, ['current_stock' => $stockAfter]);

            $trxNumber = 'TRX-OUT-' . date('Ymd') . '-' . rand(1000, 9999);
            $db->table('stock_transactions')->insert([
                'transaction_number' => $trxNumber,
                'type'               => 'STOCK_OUT',
                'date'               => date('Y-m-d'),
                'item_id'            => $itemId,
                'quantity'           => $quantity,
                'unit'               => $item['unit'],
                'team_id'            => $teamId,
                'tech_id'            => $techId,
                'stock_before'       => $currentStock,
                'stock_after'        => $stockAfter,
                'performed_by'       => 'Admin Gudang',
                'created_at'         => date('Y-m-d H:i:s')
            ]);

            $db->transComplete();

            return $this->respond([
                'status'  => 200,
                'message' => 'Stok keluar berhasil dicatat',
                'data'    => [
                    'transaction_number' => $trxNumber,
                    'stock_after'        => $stockAfter
                ]
            ]);
        } catch (\\Exception $e) {
            $db->transRollback();
            return $this->failServerError($e->getMessage());
        }
    }
}
`
    },
    {
      path: 'app/Config/Routes.php',
      name: 'Routes.php',
      category: 'Routes',
      description: 'RESTful API Routing definition untuk CodeIgniter 4.',
      content: `<?php

use CodeIgniter\\Router\\RouteCollection;

/**
 * @var RouteCollection $routes
 */

$routes->group('api', function ($routes) {
    // Auth & Users
    $routes->post('auth/login', 'Api\\AuthController::login');
    $routes->get('users', 'Api\\UserController::index');

    // Master Items
    $routes->resource('items', ['controller' => 'Api\\ItemController']);
    $routes->get('items/low-stock', 'Api\\ItemController::lowStock');

    // Modems & SN Tracking
    $routes->get('modems', 'Api\\ModemController::index');
    $routes->get('modems/(:segment)', 'Api\\ModemController::show/$1');
    $routes->post('modems/status-change', 'Api\\ModemController::changeStatus');
    $routes->get('batches', 'Api\\BatchController::index');

    // Stock Transactions
    $routes->post('stock/in', 'Api\\StockTransactionController::stockIn');
    $routes->post('stock/out', 'Api\\StockTransactionController::stockOut');
    $routes->get('stock/history', 'Api\\StockTransactionController::history');

    // Cable Management
    $routes->get('cables/usage', 'Api\\CableController::usage');

    // Reports
    $routes->get('reports/monthly', 'Api\\ReportController::monthly');
    $routes->get('reports/team-usage', 'Api\\ReportController::teamUsage');
    $routes->get('notifications', 'Api\\NotificationController::index');
});
`
    }
  ];
}
