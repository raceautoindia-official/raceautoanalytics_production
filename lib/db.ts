import mysql from "mysql2/promise";

// Create the connection to database
const db = mysql.createPool({
  host:process.env.DB_HOST,
  user:  process.env.DB_USER,
  database:  process.env.DB_NAME,
  password:  process.env.DB_PASSWORD,
  waitForConnections: true,
  // Kept BELOW the MySQL server's max_connections (default 151). The previous
  // value (1500) let the pool open far more connections than the server allows,
  // so under load MySQL rejected them with "Too many connections" — surfacing
  // as intermittently-blank CMS pages (failed query → empty data, no console
  // error). With waitForConnections + queueLimit:0, excess queries QUEUE (wait)
  // instead of failing, so normal flow is unchanged. If you run multiple app
  // instances, size this as (max_connections - headroom) / instances.
  connectionLimit: 50,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// const db = mysql.createPool({
//   host: "racedev-db.c1u6o2ewayxy.ap-south-1.rds.amazonaws.com",
//   user: "root",
//   database: "race_news",
//   password: "Racedeveloper2024",
//   waitForConnections: true,
//   connectionLimit: 80,
//   // maxIdle: 10,
//   idleTimeout: 60000,
//   keepAliveInitialDelay: 0,
//   queueLimit: 0,
//   enableKeepAlive: true,
 
// });

// console.log("Connected to MySQL database");

export default db;


// aws db password: Racedeveloper2024

// Master username
//root
//Master password
//Racedeveloper2024
