const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database');

  // Check if database exists, if not create it
  db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE}`, err => {
    if (err) {
      console.error('Error creating database:', err);
      return;
    }
    console.log('Database created or already exists');
  });

  // Use the specified database
  db.query(`USE ${process.env.DB_DATABASE}`, err => {
    if (err) {
      console.error('Error selecting database:', err);
      return;
    }
    console.log('Using database:', process.env.DB_DATABASE);
  });

  // Check if table exists, if not create it
  db.query(`CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    code VARCHAR(10) UNIQUE
  )`, err => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Table created or already exists');
  });

  db.query(`CREATE TABLE IF NOT EXISTS examList (
    courseId INT NOT NULL,
    courseCode VARCHAR(30) NOT NULL,
    examName VARCHAR(30) NOT NULL,
    weightage INT NOT NULL,
    noOfExams INT NOT NULL,
    PRIMARY KEY (courseId, examName),
    FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
  )`, error => {
    if(error) {
      console.error('Error creating exam list table: ', error);
      return;
    }
    console.log('exam list table created successfully');
  });

  

  db.query(`DROP PROCEDURE IF EXISTS drop_tables_with_pattern`, error => {
    if(error) {
      console.error('Error in dropping procedure.', error);
      return;
    }
    console.log('Procedure already existed, So dropped it.');
  });


  // Define the procedure query
const procedureQuery = `
CREATE PROCEDURE drop_tables_with_pattern(IN pattern VARCHAR(255))
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE tableName VARCHAR(255);
    DECLARE cur CURSOR FOR SELECT table_name FROM information_schema.tables WHERE table_name LIKE CONCAT(pattern, '%');
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO tableName;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET @sql = CONCAT('DROP TABLE IF EXISTS ', tableName);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE cur;
END
`;
db.query(procedureQuery,error=>{
  if(error){
    console.error(error);
  }
  console.log("Procedure Query is executed Successfully.");
});


});

module.exports = db;