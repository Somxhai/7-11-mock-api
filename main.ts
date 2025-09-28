import { Hono } from "hono";
import { parse } from "jsr:@std/csv";

const app = new Hono();

// โหลด CSV แค่ครั้งเดียวตอน server start
const data = await Deno.readTextFile("./grocery_inventory.csv");
const allRecords = parse(data, { skipFirstRow: true }) as any[];

// สมมุติว่า CSV มี column: product_id, name, price, sku, category
// แปลงให้เป็น object array

const products = allRecords.map((row) => ({
  product_id: row["Product_ID"].toLowerCase(),
  product_name: row["Product_Name"],
  catagory: row["Catagory"],
  supplier_id: row["Supplier_ID"],
  supplier_name: row["Supplier_Name"],
  stock_quantity: Number(row["Stock_Quantity"] ?? 0),
  reorder_level: Number(row["Reorder_Level"] ?? 0),
  reorder_quantity: Number(row["Reorder_Quantity"] ?? 0),
  unit_price: parseFloat((row["Unit_Price"] ?? "0").replace(/^\$/, "").trim()),

  // Convert MM/DD/YYYY -> YYYY-MM-DD
  date_received: new Date(row["Date_Received"]).toISOString().split("T")[0],
  last_order_date: new Date(row["Last_Order_Date"]).toISOString().split("T")[0],
  expiration_date: new Date(row["Expiration_Date"]).toISOString().split("T")[0],

  warehouse_location: row["Warehouse_Location"],
  sales_volume: Number(row["Sales_Volume"] ?? 0),
  inventory_turnover_rate: Number(row["Inventory_Turnover_Rate"] ?? 0),
  status: row["Status"],
}));
app.get("/", (c) => c.text("Hello Hono!"));

// Cursor pagination: query params ?limit=30&cursor=123
app.get("/product/catalog", (c) => {
  const limit = Number(c.req.query("limit") ?? 30);
  const cursor = c.req.query("cursor"); // product_id ของ batch ก่อนหน้า

  let batch: typeof products;

  if (cursor) {
    // เลือกสินค้าที่ product_id > cursor (เรียงแบบ ascending)
    batch = products
      .filter((p) => p.product_id > cursor)
      .slice(0, limit);
  } else {
    batch = products.slice(0, limit);
  }

  // nextCursor = product_id ของ item สุดท้ายใน batch หรือ null
  const nextCursor = batch.length > 0
    ? batch[batch.length - 1].product_id
    : null;

  console.log({
    products: batch.slice(0, 2),
    nextCursor,
    limit,
  });
  return c.json({
    products: batch,
    nextCursor,
    limit,
  });
});

Deno.serve(app.fetch);
