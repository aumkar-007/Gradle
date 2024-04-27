const express = require('express');
const router = express.Router();
const path = require("path");
const fs = require("fs");
const connection = require("../config/db");
const { Console } = require('console');
const userFilePath = path.join(__dirname, "..", "files");
var fs1 = require("fs-extra");
const XLSX = require("xlsx");

function generateExamList(data) {
  const examMap = {};
  data.forEach(exam => {
    if (exam.noOfExams === 1) {
      // For exams with count equal to 1
      examMap[exam.examName] = parseFloat((exam.weightage).toFixed(3));
    } else {
      // For exams with count greater than 1
      for (let i = 1; i <= exam.noOfExams; i++) {
        examMap[`${exam.examName}${i}`] = parseFloat((exam.weightage / exam.noOfExams).toFixed(3));
      }
    }
  });
  return examMap;
}

router.get('/getCourse', (req, res) => {
  console.log("I am inside the get request of router and it will call the getAllCourses function");

  const query = 'SELECT * FROM courses';
  connection.query(query, (error, results)=>{
    if(error){
      console.error("Error fetching courses");
      res.status(500).json({error:"Internal server error"});
    }else{
      // console.log(res);
      res.status(200).json(results);
    }
  });

});

router.post('/addCourse', (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  connection.query(
    `CREATE TABLE IF NOT EXISTS ${code}_assessment (
      Roll_Number INT PRIMARY KEY,
      Total_Score FLOAT DEFAULT 0,
      Grade VARCHAR(30)
    )`,
    (err, createTableRes) => {
      if (err) {
        console.error("Assessment table couldn't be created......");
        console.error(err);
      } else {
        console.log("Assessment table is created");
        
        // Create trigger for automatic grading
        
        // const insertTriggerQuery = `
        //   CREATE TRIGGER calculate_grade
        //   BEFORE INSERT ON ${code}_assessment
        //   FOR EACH ROW
        //   BEGIN
        //       IF NEW.Total_Score > 90 THEN
        //           SET NEW.Grade = 'A+';
        //       ELSEIF NEW.Total_Score <= 90 AND NEW.Total_Score > 80 THEN
        //           SET NEW.Grade = 'A';
        //       ELSE
        //           SET NEW.Grade = 'C';
        //       END IF;
        //   END;
        // `;

        // Create trigger for automatic grading (BEFORE UPDATE)
        // const updateTriggerQuery = `
        //   CREATE TRIGGER update_grade
        //   BEFORE UPDATE ON ${code}_assessment
        //   FOR EACH ROW
        //   BEGIN
        //       IF NEW.Total_Score > 90 THEN
        //           SET NEW.Grade = 'A+';
        //       ELSEIF NEW.Total_Score <= 90 AND NEW.Total_Score > 80 THEN
        //           SET NEW.Grade = 'A';
        //       ELSE
        //           SET NEW.Grade = 'C';
        //       END IF;
        //   END;
        // `;

        // connection.query(insertTriggerQuery, (insertTriggerErr, insertTriggerRes) => {
        //   if (insertTriggerErr) {
        //     console.error("Trigger for INSERT couldn't be created:", insertTriggerErr);
        //   } else {
        //     console.log("Trigger for automatic grading (INSERT) is created");
            
        //     // Execute the second trigger creation query
        //     connection.query(updateTriggerQuery, (updateTriggerErr, updateTriggerRes) => {
        //       if (updateTriggerErr) {
        //         console.error("Trigger for UPDATE couldn't be created:", updateTriggerErr);
        //       } else {
        //         console.log("Trigger for automatic grading (UPDATE) is created");
        //       }
        //     });
        //   }
        // });
      }
    }
  );
  

  const query = 'INSERT INTO courses (name, code) VALUES (?, ?)';
  connection.query(query, [name, code],(err, result)=>{
    if(err){
      console.log(err);
      res.status(500).json({error:"Internal Server Error"});
    }else{
      console.log(result);
      res.status(201).json({message:"Course added successfully."});
    }
  });
});


router.delete('/deleteCourse/:id', (req, res) => {
  const courseId = req.params.id;

  try {
    connection.query(`SELECT code FROM courses WHERE id = ?`, [courseId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (result.length > 0) {
        const code = result[0].code;

        connection.query(`DROP TABLE IF EXISTS ${code}_assessment`, (err, dropResult) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          console.log("Dropping the assessment table as course is being dropped.....");
          // console.log(dropResult);

          const deleteQuery = 'DELETE FROM courses WHERE id = ?';
          connection.query(deleteQuery, [courseId], (err, deleteResult) => {
            if (err) {
              console.error('Error deleting course:', err);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (deleteResult.affectedRows === 0) {
              return res.status(404).json({ error: 'Course not found' });
            }

            const dropTablePattern = `CALL drop_tables_with_pattern('${code}_');`;

            connection.query(dropTablePattern, (err, examlistresult)=>{
              if(err){
                console.error(err);
                return res.status(500).send({error: "Dropped all tables starting with the course code."});
              }

              var courseFolder = `${userFilePath}/${code}`;
              if (fs.existsSync(courseFolder)) {
                fs.readdirSync(courseFolder).forEach((file) => {
                    const curPath = path.join(courseFolder, file);
                    if (fs.lstatSync(curPath).isDirectory()) { // recursive
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(courseFolder); // delete folder
                console.log(`Folder '${courseFolder}' and its contents have been deleted.`);
              } else {
                  console.log(`Folder '${courseFolder}' does not exist.`);
              }
            });
            res.status(200).json({ message: 'Course deleted successfully' });
          });
        });
      } else {
        console.error('No record found for the given courseId');
        return res.status(404).json({ error: 'Course not found' });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/course/:id', (req, res) => {
  const courseId = req.params.id;
  console.log("We r indide the api to get course details... and courseId is ....", courseId);
  // Query to select the course details based on the provided ID
  const query = 'SELECT name, code FROM courses WHERE id = ?';
  
  connection.query(query, [courseId], (error, results) => {
    if (error) {
      console.error("Error fetching course details:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Check if the course with the provided ID exists
    if (results.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }


    // Return the course details
    // console.log(results[0]);
    res.status(200).json(results[0]);
  });
});

router.post('/calculateGrade', (req,res) => {
  const { courseId, code } = req.body;
  console.log("Calculation ", courseId,"   ", code);
   // Validate input fields
   if (!courseId || !code ) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const sqlQuery = `SELECT * FROM examlist WHERE courseCode = '${code}'`;
  
  // Execute the query
  connection.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      return;
    }
    console.log(results);
    const examList = generateExamList(results);
    console.log(examList);
    var totalWeightage = 0;
    for (const key in examList) {
      if (examList.hasOwnProperty(key)) {
        totalWeightage += examList[key];
      }
    }
    console.log(totalWeightage);
    let sqlQuery = `UPDATE ${code}_assessment SET Total_Score = CAST((`;
    let firstColumn = true;
    for (const [examName, weightage] of Object.entries(examList)) {
      if (!firstColumn) {
        sqlQuery += ' + ';
      }
      sqlQuery += `(${code}_assessment.${examName} * ${weightage}/100)`;
      firstColumn = false;
    }
    sqlQuery += `)/${totalWeightage}*100 AS DECIMAL(10,3))`;
    console.log(sqlQuery);

    connection.query(sqlQuery,(err,sqlResult)=>{
      if(err){
        console.error(err);
        res.status(500).json({error:"Ïnternal Server Error."});
      }
      console.log("Total Sum Calculated Successfully.");

      connection.query(`SELECT * FROM ${code}_assessment`, (err, data) => {
        if (err) {
          console.error('Error fetching assessment data:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        const totalScores = data.map(item => item.Total_Score);
        const mean = totalScores.reduce((acc, val) => acc + val, 0) / totalScores.length;
        const stdDev = Math.sqrt(totalScores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / totalScores.length);

        // Update grade based on mean and standard deviation
        connection.query(`UPDATE ${code}_assessment SET Grade = 
          CASE
            WHEN Total_Score > ${mean + 3 * stdDev} THEN 'A+'
            WHEN Total_Score > ${mean + 2 * stdDev} AND Total_Score <= ${mean + 3 * stdDev} THEN 'A'
            WHEN Total_Score > ${mean + 1 * stdDev} AND Total_Score <= ${mean + 2 * stdDev} THEN 'B+'
            WHEN Total_Score > ${mean + 0 * stdDev} AND Total_Score <= ${mean + 1 * stdDev} THEN 'B'
            WHEN Total_Score > ${mean - 1 * stdDev} AND Total_Score <= ${mean + 0 * stdDev} THEN 'C+'
            WHEN Total_Score > ${mean - 2 * stdDev} AND Total_Score <= ${mean - 1 * stdDev} THEN 'C'
            WHEN Total_Score > ${mean - 3 * stdDev} AND Total_Score <= ${mean - 2 * stdDev} THEN 'D'
            ELSE 'E'
          END`, (err, updateResult) => {
          if (err) {
            console.error('Error updating grades:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          connection.query(`SELECT * FROM ${code}_assessment`, (err, data) => {
            if (err) {
              console.error('Error fetching assessment data:', err);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Grades');

            // Save workbook to a file
            var courseFolder = `${userFilePath}/${code}`;
            const filePath = path.join(courseFolder, `${code}_grades.xlsx` );;
            XLSX.writeFile(wb, filePath);

            console.log(`File ${filePath} saved successfully.`);
            res.status(200).json({ message: `Grades saved to ${filePath}` });
          });
        });
      });
    });
  });
});

router.post('/addExam', (req, res) => {
  const { courseId, code, examName, weightage, noOfExams } = req.body;
  console.log("addexam Api is being hit... with: ", courseId,"   ", code,"   ", examName,"   ", weightage,"   ", noOfExams);

  // Validate input fields
  if (!courseId || !code || !examName || !weightage || !noOfExams) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (typeof weightage !== 'number' || weightage <= 0) {
    return res.status(400).json({ error: 'Weightage must be a positive number' });
  }

  if (typeof noOfExams !== 'number' || noOfExams <= 0) {
    return res.status(400).json({ error: 'Number of exams must be a positive number' });
  }

  // Proceed to insert data into the database
  const query = 'INSERT INTO examList (courseId, courseCode, examName, weightage, noOfExams) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [courseId, code, examName, weightage, noOfExams], async (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if(noOfExams==1){
      connection.query(`ALTER TABLE ${code}_assessment ADD ${examName} INT DEFAULT 0`,(err, result2)=>{
        if(err){
          console.log(err);
          return res.status(500).json({error:"Internal Server Error, Unable to alter table code_assessment"});
        }
      });
    }else{
      for(let i=0;i<noOfExams;i++){
        await connection.query(`ALTER TABLE ${code}_assessment ADD ${examName}${i+1} INT DEFAULT 0`, (err, result3)=>{
          if(err){
            console.log(err);
            return res.status(500).json({error:"Internal Server error, unable to alter table code_assessment"});
          }
        });
      }
    }
    // console.log(result);
    res.status(201).json({ message: "Exam added successfully." });
  });
});

router.get('/getExams/:courseId', (req, res) => {
  const courseId = req.params.courseId;

  // Query to fetch exams for the provided courseId
  const query = 'SELECT * FROM examList WHERE courseId = ?';

  connection.query(query, [courseId], (error, results) => {
    if (error) {
      console.error("Error fetching exams:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Return the list of exams
    // console.log(results);
    res.status(200).json(results);
  });
});

module.exports = router ;
