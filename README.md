🚀 Livestream Overlay Manager
A full-stack application built to manage and position custom overlays (text and logos) on top of a video stream, complete with a persistent CRUD API.

Requirement  	      Status	                Implementation Details
Tech Stack	        Complete	              React (Frontend), Python Flask (Backend), TinyDB (Database Placeholder for MongoDB)
Video Streaming 	  Complete	              Accepts YouTube URL/ID as a stable placeholder for the RTSP URL requirement.
Overlay Options	    Complete	              Supports adding, positioning, and deleting text and image/logo overlays.
CRUD API	          Complete	              Full API implemented for Create, Read, Update, and Delete.

⚙️ Setup and Installation
Follow these steps to get the application running locally.

1. Backend Setup (Python/Flask)
Dependencies: Ensure you have Python and pip installed.

Install Libraries: Navigate to the backend directory (where app.py is located) and install Flask and other dependencies:

Bash

pip install Flask flask-cors tinydb
Run Server: Start the Flask API:

Bash
python app.py
The API will be available at http://localhost:5000.

2. Frontend Setup (React)
Dependencies: Ensure you have Node.js and npm/yarn installed.
Install Libraries: Navigate to the frontend directory and install dependencies:

Bash

npm install
# or yarn install
Run Application: Start the React development server:

Bash

npm start
# or yarn start
The application will open in your browser, typically at http://localhost:3000.

📄 API Documentation

Action	   HTTP Method	Endpoint          	Description
Create	   POST	/api/overlays	              Creates and saves new custom overlay settings, including position, size, and content. 
Read All	 GET	/api/overlays	              Retrieves all saved overlay settings.
Update	   PUT	/api/overlays/{id}	        Modifies existing overlay settings (e.g., changes its position via drag-and-drop). 
Delete	   DELETE	/api/overlays/{id}	      Deletes a saved overlay setting.


The backend provides a RESTful API for managing overlays. The base URL is http://localhost:5000/api/overlays.

