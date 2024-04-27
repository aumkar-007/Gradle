const express = require('express');
const router = express.Router();
const path = require("path");
const formidable = require("formidable");
const connection = require("../config/db");
const fs = require("fs");
var fs1 = require("fs-extra");
const XLSX = require("xlsx");
const { addExamData } = require('../utils/utilityFunctions');
const userFilePath = path.join(__dirname, "..", "files");


router.get("/getFileStatus/:courseId/:courseCode/:examName", (req, res) => {
    // console.log("get request is hit...");
    try {
        var courseFolder = `${userFilePath}/${req.params.courseCode}`;
      //checking if a file exists
      if (fs.existsSync(`${courseFolder}/${req.params.examName}_uploaded.xlsx`))
        res.status(200).send({ result: true });
      else res.status(200).send({ result: false });
    } catch (error) {
      console.log(error);
      res.status(500).send({ result: error.message });
    }
});

router.get("/getModifiedFileStatus/:courseId/:courseCode/:examName", (req, res) => {
  // console.log("get request is hit...");
  try {
      var courseFolder = `${userFilePath}/${req.params.courseCode}`;
    //checking if a file exists
    if (fs.existsSync(`${courseFolder}/${req.params.examName}_modified.xlsx`))
      res.status(200).send({ result: true });
    else res.status(200).send({ result: false });
  } catch (error) {
    console.log(error);
    res.status(500).send({ result: error.message });
  }
});

router.get("/getGradeFileStatus/:courseId/:courseCode", (req, res) => {
  console.log("get grade file is hit.");
  try {
      var courseFolder = `${userFilePath}/${req.params.courseCode}`;
    //checking if a file exists
    if (fs.existsSync(`${courseFolder}/${req.params.courseCode}_grades.xlsx`))
      res.status(200).send({ result: true });
    else res.status(200).send({ result: false });
  } catch (error) {
    console.log(error);
    res.status(500).send({ result: error.message });
  }
});

router.post('/updateExamDatabase/:courseId/:courseCode/:examName', (req,res)=>{
  console.log("Inside the post request of update exam database...........");
  const courseFolder = `${userFilePath}/${req.params.courseCode}`;
  const filePath = `${courseFolder}/${req.params.examName}_uploaded.xlsx`;
  var form = new formidable.IncomingForm();

  
  form.parse(req, async function(err, fields, files){
    var RollNumber = fields.RollNumber;
    var Marks = fields.Marks;

    connection.query(`CREATE TABLE IF NOT EXISTS ${req.params.courseCode}_${req.params.examName} (
      courseId INT NOT NULL DEFAULT ${req.params.courseId},
      Roll_Number INT PRIMARY KEY,
      Marks INT DEFAULT 0,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
    )`, async (err, res1)=>{
      if(err){
        console.log("Error in creating the table coursecode_examname.....");
        return res.status(500).json({ error: 'Internal Server Error' });
      }else{
        await addExamData(filePath, RollNumber, Marks, req.params.examName, req.params.courseCode);
        return res.status(200).json({ message: 'Database for this exam populated successfully.' });
      }
    });

  });
});


router.post('/uploadFile/:courseId/:courseCode/:examName', (req, res) => {
    console.log("Inside the post request of uploadFile...........");
    var form = new formidable.IncomingForm();

    form.parse(req, async function (err, fields, files) {
        if (err) {
          console.error(err);
          return res.status(500).send({ error: "File parsing failed" });
        }
        var oldpath = files.file[0].filepath;
        var courseFolder = `${userFilePath}/${req.params.courseCode}`;
        var newpath = `${courseFolder}/${req.params.examName}_uploaded.xlsx`;

        await fs1.pathExists(newpath, async function (err, exists) {
          if (exists) {
            console.log("Destination file already exists");
            return res
              .status(400)
              .send({ error: "Destination file already exists" });
          }

          // Make sure the course folder exists before moving the file
          await fs1.ensureDir(courseFolder, function (err) {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .send({ error: "Failed to create branch folder" });
            }
            // Move the file to the destination path
            fs1.move(oldpath, newpath, { overwrite: true }, async function (err) {
              if (err) {
                console.log("Some error occured...")
                console.error(err);
                return res.status(500).send({ error: "File rename failed" });
              }
              res.status(200).send({ result: "File renamed" });
            });
          });
        });
      });
  });


router.delete('/deleteExam/:courseId/:courseCode/:examName',(req,res)=>{
  console.log("Inside the delete exam request...");
  const dropColumnSqlQuery = `ALTER TABLE ${req.params.courseCode}_assessment DROP COLUMN ${req.params.examName}`;
  const courseFolder = `${userFilePath}/${req.params.courseCode}`;
  const filePath = `${courseFolder}/${req.params.examName}_uploaded.xlsx`;
  const modifiedFilePath = `${courseFolder}/${req.params.examName}_modified.xlsx`;

  connection.query(dropColumnSqlQuery, (err, res1)=>{
    if(err){
      console.error(err);
      return res.status(500).json({error:"Internal Server Error."});
    }
    console.log("Column dropped from assessment.");
    const dropTableSqlQuery = `DROP TABLE IF EXISTS ${req.params.courseCode}_${req.params.examName}`;

    connection.query(dropTableSqlQuery, (err, res2)=>{
      if(err){
        console.error(err);
        return res.status(500).json({error:"Internal Server Error while dropping the table code_exam."});
      }
      console.log("table dropped for exam.");

      const exam = req.params.examName;
      if(isNaN(exam.charAt(exam.length - 1))){
        const rowDeleteQuery =`DELETE FROM examlist WHERE examName='${exam}'`;

        connection.query(rowDeleteQuery,async (err,result)=>{
          if(err){
            console.error(err);
            return res.status(500).json({error:"Internal Server Error while dropping the table code_exam."});
          }
            // DELETE THE FILE FROM SYSTEM.......

          try {
            if (fs.existsSync(filePath)) {
              await fs.unlinkSync(filePath);
              console.log(`File ${filePath} removed successfully`);
            } else {
              console.log(`File ${filePath} does not exist`);
            }
          } catch (error) {
            console.error(`Error removing file ${filePath}:`, error);
          }

          try {
            if (fs.existsSync(modifiedFilePath)) {
              await fs.unlinkSync(modifiedFilePath);
              console.log(`File ${modifiedFilePath} removed successfully`);
            } else {
              console.log(`File ${modifiedFilePath} does not exist`);
            }
          } catch (error) {
            console.error(`Error removing file ${modifiedFilePath}:`, error);
          }
          ///
            
            return res.status(200).json({result: "Successfull"});
        });
      }else{
        const newExamName = exam.replace(/\d+$/, '');
        const queryRes = `SELECT weightage, noOfExams 
               FROM examlist 
               WHERE examName = '${newExamName}' AND courseCode='${req.params.courseCode}'`;

        connection.query(queryRes, (err,res3)=>{
          if(err){
            console.error(err);
            return res.status(500).json({error:"Internal Server Error."});
          }

          if (res3.length === 0) {
            console.log(`No data found for exam`);
            return res.status(500).json({error:"Internal Server Error."});
          }
        
          const examData = res3[0]; // Assuming only one row is expected
          const { weightage, noOfExams } = examData;
          
          let innerQuery = '';
          if (noOfExams === 1) {
            // If count is 1, construct DELETE query
            innerQuery = `DELETE FROM examlist WHERE name = '${newExamName}' AND courseCode = '${req.params.courseCode}'`;
          } else if (noOfExams > 1) {
            // If count is greater than 1, calculate new weightage and count and construct UPDATE query
            const newWeightage = weightage - ( weightage / noOfExams);
            const newCount = noOfExams - 1;
            innerQuery = `UPDATE examlist SET weightage = ${newWeightage}, noOfExams = ${newCount} WHERE examName = '${newExamName}' AND courseCode='${req.params.courseCode}'`;
          }

          connection.query(innerQuery, async (err,res4)=>{
            if(err){
              console.error(err);
              return res.status(500).json({error:"Internal Server Error."});
            }
            
            try {
              if (fs.existsSync(filePath)) {
                await fs.unlinkSync(filePath);
                console.log(`File ${filePath} removed successfully`);
              } else {
                console.log(`File ${filePath} does not exist`);
              }
            } catch (error) {
              console.error(`Error removing file ${filePath}:`, error);
            }

            try {
              if (fs.existsSync(modifiedFilePath)) {
                await fs.unlinkSync(modifiedFilePath);
                console.log(`File ${modifiedFilePath} removed successfully`);
              } else {
                console.log(`File ${modifiedFilePath} does not exist`);
              }
            } catch (error) {
              console.error(`Error removing file ${modifiedFilePath}:`, error);
            }

            return res.status(200).json({result: "Successfull"});
          });
        });
      }
    });
  });
});

router.delete('/deleteFile/:courseId/:courseCode/:examName', (req, res) => {
    console.log("Inside the DELETE request of deleteFile.");
    const courseFolder = `${userFilePath}/${req.params.courseCode}`;
    const filePath = `${courseFolder}/${req.params.examName}_uploaded.xlsx`;
    const modifiedFilePath = `${courseFolder}/${req.params.examName}_modified.xlsx`;

    fs1.pathExists(modifiedFilePath, (err,exists)=>{
      if(exists){
        console.log("Modified file exists.");
        fs1.remove(modifiedFilePath, (err)=>{
          if(err){
            console.error(err);
            return res.status(500).send({error: "Failed to delete modified file."});
        
          }
          console.log("Modified file deleted successfully.");
          const query = `DROP TABLE IF EXISTS ${req.params.courseCode}_${req.params.examName}`;
          connection.query(query, (err,resultq)=>{
            if(err){
              console.error("Error in dropping the exam table for this course.");
              console.error(err);
              return res.status(500).send({error: "Error in dropping table."});
            }
            console.log("Dropped the table coursecode_examname");
            console.log(resultq);
            const setQuery = `UPDATE ${req.params.courseCode}_assessment SET ${req.params.examName}=0`;

            connection.query(setQuery, (err, resultset)=>{
              if(err){
                console.error(err);
                return res.status(500).send({error: "Error in updating assessment table."});

              }
              console.log("Table column set.");
              console.log(resultset);

              fs1.remove(filePath,(error)=>{
                if(error){
                  console.error(error);
                  return res.status(500).send({error: "Failed to delete the file."});
                }
                console.log("File delete Successfull.");
                res.status(200).send({result:"File delete Successfull."});
              })
            });
          });
        })
      }else{
        fs1.remove(filePath, function (err) {
          if (err) {
              console.error(err);
              return res.status(500).send({ error: "Failed to delete file" });
          }
          console.log("File deleted.");
          res.status(200).send({ result: "File deleted" });
      });
      }
    });
});

router.get('/getColumns/:courseId/:courseCode/:examName',(req,res)=>{
    console.log("Inside the getColumns api.........");
    const courseFolder = `${userFilePath}/${req.params.courseCode}`;
    const filePath = `${courseFolder}/${req.params.examName}_uploaded.xlsx`;

    try {
        // console.log("inside try");
        var workbook = XLSX.readFile(filePath);
        var statussheet = workbook.Sheets[workbook.SheetNames[0]];
        //making sure that we get all the column values/names.
        var applicantsData = XLSX.utils.sheet_to_json(statussheet, {
          header: 1,
        });
        // console.log(applicantsData);
        var columnNames = applicantsData[0];
        // console.log(columnNames);
        res.status(200).send({ result: columnNames });
      } catch (error) {
        console.log(error);
        res.status(500).send({});
      }

});

router.get('/downloadGradeFile/:courseId/:courseCode', (req, res) => {
  console.log("Inside the download grade file API.");
  const courseFolder = `${userFilePath}/${req.params.courseCode}`;
  const filePath = `${courseFolder}/${req.params.courseCode}_grades.xlsx`;

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Set response headers
    res.setHeader('Content-disposition', `attachment; filename=${req.params.courseCode}_grades.xlsx`);
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Create a read stream from the file
    const fileStream = fs.createReadStream(filePath);

    // Pipe the file stream to the response object
    fileStream.pipe(res);
  } else {
    // If the file does not exist, send a 404 response
    res.status(404).send('File not found.');
  }
});


module.exports = router;