# GRADLE TOOL

### Grading System for Courses in IIT GOA

### SETUP

* Setup the environment variable in .env file present inside backend folder and the Gradle Folder
#### .env in Backend

DB_HOST=your_host_name (by default it is localhost for MySQL)
DB_USER=your_user_name
DB_PASSWORD=your_my_sql_workbench_user_password
DB_DATABASE=gradle
PORT= 4444

#### .env in Frontend (Gradle Folder)

REACT_APP_BACKEND_URL=http://localhost:4444 (For Running Locally Only)

OR

REACT_APP_BACKEND_URL=http://<your_IP_Address>:4444

* Navigate to Backend Folder and Run npm-start

* Navigate to Gradle Folder (Frontend Folder) and Run npm-start
