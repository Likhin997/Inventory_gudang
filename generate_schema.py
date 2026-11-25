import re

schema = """
import { pgTable, text, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  password: text('password'),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  avatar: text('avatar'),
  phone: text('phone'),
  active: boolean('active').default(true),
  teamId: text('team_id'),
  createdAt: text('created_at'),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  pic: text('pic').notNull(),
  phone: text('phone').notNull(),
  status: text('status').notNull(),
  coverageArea: text('coverage_area'),
  membersCount: integer('members_count').notNull(),
});

export const technicians = pgTable('technicians', {
  id: text('id').primaryKey(),
  nik: text('nik').notNull(),
  name: text('name').notNull(),
  teamId: text('team_id').notNull(),
  teamName: text('team_name').notNull(),
  phone: text('phone').notNull(),
  status: text('status').notNull(),
  email: text('email'),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  itemCount: integer('item_count'),
});

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  contactPerson: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  client: text('client').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull(),
  startDate: text('start_date'),
});

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  categoryId: text('category_id').notNull(),
  categoryType: text('category_type').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  unit: text('unit').notNull(),
  currentStock: integer('current_stock').notNull(),
  minStock: integer('min_stock').notNull(),
  location: text('location').notNull(),
  defaultPrice: integer('default_price').notNull(),
  description: text('description').notNull(),
  isSerialTracked: boolean('is_serial_tracked').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const batches = pgTable('batches', {
  id: text('id').primaryKey(),
  batchNumber: text('batch_number').notNull(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name').notNull(),
  dateIn: text('date_in').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  notes: text('notes').notNull(),
  availableCount: integer('available_count').notNull(),
  outCount: integer('out_count').notNull(),
  brokenCount: integer('broken_count').notNull(),
  installedCount: integer('installed_count').notNull(),
});

export const modemSns = pgTable('modem_sns', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  batchId: text('batch_id').notNull(),
  batchNumber: text('batch_number').notNull(),
  serialNumber: text('serial_number').notNull(),
  macAddress: text('mac_address'),
  status: text('status').notNull(),
  location: text('location').notNull(),
  dateIn: text('date_in').notNull(),
  supplierName: text('supplier_name').notNull(),
  price: integer('price').notNull(),
  notes: text('notes').notNull(),
  assignedTeamId: text('assigned_team_id'),
  assignedTeamName: text('assigned_team_name'),
  assignedTechId: text('assigned_tech_id'),
  assignedTechName: text('assigned_tech_name'),
  projectName: text('project_name'),
  purpose: text('purpose'),
  customerName: text('customer_name'),
  customerAddress: text('customer_address'),
  installedDate: text('installed_date'),
  opticalPower: text('optical_power'),
  odpPort: text('odp_port'),
  installationPhoto: text('installation_photo'),
  history: jsonb('history').notNull(),
});

export const cableUsages = pgTable('cable_usages', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  teamId: text('team_id').notNull(),
  teamName: text('team_name').notNull(),
  techId: text('tech_id').notNull(),
  techName: text('tech_name').notNull(),
  metersUsed: integer('meters_used').notNull(),
  date: text('date').notNull(),
  project: text('project').notNull(),
  purpose: text('purpose').notNull(),
  notes: text('notes').notNull(),
  performedBy: text('performed_by').notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  transactionNumber: text('transaction_number').notNull(),
  type: text('type').notNull(),
  date: text('date').notNull(),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  categoryType: text('category_type').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull(),
  teamId: text('team_id'),
  teamName: text('team_name'),
  techId: text('tech_id'),
  techName: text('tech_name'),
  project: text('project'),
  purpose: text('purpose'),
  invoiceNumber: text('invoice_number'),
  batchNumber: text('batch_number'),
  supplierName: text('supplier_name'),
  serialNumbers: jsonb('serial_numbers'),
  notes: text('notes').notNull(),
  stockBefore: integer('stock_before').notNull(),
  stockAfter: integer('stock_after').notNull(),
  performedBy: text('performed_by').notNull(),
  status: text('status').notNull(),
  approvalId: text('approval_id'),
});

export const opnames = pgTable('opnames', {
  id: text('id').primaryKey(),
  opnameNumber: text('opname_number').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull(),
  categoryFilter: text('category_filter'),
  performedBy: text('performed_by').notNull(),
  verifiedBy: text('verified_by'),
  notes: text('notes').notNull(),
  itemsCheckedCount: integer('items_checked_count').notNull(),
  totalDifference: integer('total_difference').notNull(),
  details: jsonb('details').notNull(),
  items: jsonb('items'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

export const requisitions = pgTable('requisitions', {
  id: text('id').primaryKey(),
  reqNumber: text('req_number').notNull(),
  requisitionNumber: text('requisition_number'),
  date: text('date').notNull(),
  techId: text('tech_id').notNull(),
  techName: text('tech_name').notNull(),
  teamId: text('team_id').notNull(),
  teamName: text('team_name').notNull(),
  project: text('project').notNull(),
  purpose: text('purpose').notNull(),
  notes: text('notes'),
  items: jsonb('items').notNull(),
  status: text('status').notNull(),
  supervisorNotes: text('supervisor_notes'),
  approvalNotes: text('approval_notes'),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  completedBy: text('completed_by'),
  completedAt: text('completed_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
});
"""

with open("src/db/schema.ts", "w") as f:
    f.write(schema)
