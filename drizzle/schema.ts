import { pgTable, unique, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const items = pgTable("items", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	categoryType: text("category_type").notNull(),
	categoryId: text("category_id").notNull(),
	brand: text(),
	unit: text().notNull(),
	currentStock: integer("current_stock").default(0).notNull(),
	minimumStock: integer("minimum_stock").default(0).notNull(),
	location: text(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("items_code_unique").on(table.code),
]);

export const teams = pgTable("teams", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	area: text().notNull(),
	leaderName: text("leader_name").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const transactions = pgTable("transactions", {
	id: text().primaryKey().notNull(),
	invoiceNumber: text("invoice_number").notNull(),
	type: text().notNull(),
	itemCode: text("item_code").notNull(),
	quantity: integer().notNull(),
	unit: text().notNull(),
	date: text().notNull(),
	referenceId: text("reference_id"),
	notes: text(),
	processedBy: text("processed_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("transactions_invoice_number_unique").on(table.invoiceNumber),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	uid: text().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	username: text().notNull(),
	role: text().notNull(),
	phone: text(),
	avatar: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	password: text().notNull(),
}, (table) => [
	unique("users_uid_unique").on(table.uid),
]);

export const modemSns = pgTable("modem_sns", {
	id: text().primaryKey().notNull(),
	serialNumber: text("serial_number").notNull(),
	macAddress: text("mac_address"),
	itemCode: text("item_code").notNull(),
	status: text().notNull(),
	location: text(),
	customerName: text("customer_name"),
	customerAddress: text("customer_address"),
	history: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	assignedTechId: text("assigned_tech_id"),
	assignedTechName: text("assigned_tech_name"),
	assignedTeamId: text("assigned_team_id"),
	assignedTeamName: text("assigned_team_name"),
}, (table) => [
	unique("modem_sns_serial_number_unique").on(table.serialNumber),
]);

export const technicians = pgTable("technicians", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	nik: text().notNull(),
	teamId: text("team_id").notNull(),
	teamName: text("team_name"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
	id: text().primaryKey().notNull(),
	timestamp: text().notNull(),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	details: text().notNull(),
	performedBy: text("performed_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const batches = pgTable("batches", {
	id: text().primaryKey().notNull(),
	batchNumber: text("batch_number").notNull(),
	itemCode: text("item_code").notNull(),
	quantity: integer().notNull(),
	supplierId: text("supplier_id"),
	expirationDate: text("expiration_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const cableUsages = pgTable("cable_usages", {
	id: text().primaryKey().notNull(),
	itemCode: text("item_code").notNull(),
	lengthUsed: integer("length_used").notNull(),
	technicianId: text("technician_id").notNull(),
	technicianName: text("technician_name"),
	projectName: text("project_name"),
	notes: text(),
	date: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const opnames = pgTable("opnames", {
	id: text().primaryKey().notNull(),
	opnameNumber: text("opname_number").notNull(),
	date: text().notNull(),
	performedBy: text("performed_by").notNull(),
	notes: text(),
	categoryFilter: text("category_filter"),
	details: jsonb().notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("opnames_opname_number_unique").on(table.opnameNumber),
]);

export const projects = pgTable("projects", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const requisitions = pgTable("requisitions", {
	id: text().primaryKey().notNull(),
	requestNumber: text("request_number").notNull(),
	date: text().notNull(),
	teamId: text("team_id").notNull(),
	teamName: text("team_name"),
	techId: text("tech_id"),
	techName: text("tech_name"),
	projectName: text("project_name"),
	status: text().notNull(),
	notes: text(),
	items: jsonb().notNull(),
	approvedBy: text("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("requisitions_request_number_unique").on(table.requestNumber),
]);

export const units = pgTable("units", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("units_name_unique").on(table.name),
]);

export const suppliers = pgTable("suppliers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	contact: text(),
	address: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});
