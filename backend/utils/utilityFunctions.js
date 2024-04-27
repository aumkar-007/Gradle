var XLSX = require("xlsx");
const connection = require("../config/db");
const path = require("path");
const fs = require("fs");
var fs1 = require("fs-extra");
const { merge } = require("../routes/uploadFile");
const userFilePath = path.join(__dirname, "..", "files");

async function addExamData(filePath, RollNumber, Marks, examName, courseCode){
    var workbook = XLSX.readFile(filePath);
    var applicantsDataSheet = workbook.Sheets[workbook.SheetNames[0]];
    var applicantsData = XLSX.utils.sheet_to_json(applicantsDataSheet);
    const courseFolder = `${userFilePath}/${courseCode}`;

    applicantsData.forEach(applicant => {
        const insertQuery = `
            INSERT INTO ${courseCode}_${examName} (Roll_Number, Marks)
            VALUES (${applicant[RollNumber]}, ${applicant[Marks]})`;
        
        connection.query(insertQuery, (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
            }
        });
        // console.log('Data inserted successfully');
    });

    // Fetch data from the database
    const fetchDataQuery = `SELECT * FROM ${courseCode}_${examName}`;
    await connection.query(fetchDataQuery, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return;
        }

        // Convert fetched data to XLSX format
        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        // Write to a new file
        const outputFilePath = path.join(courseFolder, `${examName}_modified.xlsx`);
        XLSX.writeFile(wb, outputFilePath);
        console.log(`Data from database ${courseCode}_${examName} has been written to ${outputFilePath}`);

        const mergeQuery = `INSERT INTO  ${courseCode}_assessment (Roll_Number, ${examName})
        SELECT e.Roll_Number, e.Marks
        FROM  ${courseCode}_${examName} e
        ON DUPLICATE KEY UPDATE
        ${courseCode}_assessment.${examName} = e.${Marks}`;

        connection.query(mergeQuery, (err, mergeResult)=>{
            if(err){
                console.error(err);
                return;
            }
            console.log("Course Assessment updated...");
        });
    });
}

module.exports = {addExamData}