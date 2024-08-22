# PROJECT OVERVIEW

* We have developed **Celestial Chatbox**, an interactive tool that allows users to search for anything related to space, powered by the integration of **Gemini AI**. This chatbox enables users to ask space-related queries and receive relevant information in real time.
* Additionally, it features an Advanced Search option for users with predefined parameters. This allows experienced users to search for specific types of stars or celestial bodies by inputting detailed criteria. The advanced search is enhanced with AI/ML capabilities, ensuring accurate and precise results based on the user's input.


### FRONTEND
* The user interface is designed using React, featuring a clean and modern layout that includes a **Navbar**, **Body**, and **Footer**. The **Navbar** provides easy navigation to various sections, while the Footer contains additional links and information.
* In the **Body**, there is a simple **Search Bar** where users can enter keywords related to space technology. Upon submission, relevant information is displayed in a user-friendly format, helping users quickly find the data they need.
* For users seeking more in-depth details, an **Advanced Search Option** is available. This feature is tailored for those with specific knowledge about stars or celestial objects, allowing them to input detailed parameters for a more refined and accurate search. Results are fetched accordingly, providing highly relevant information based on the user's input. 

### BACKEND
* The backend is developed using **Node.js** and **ExpressJS**, efficiently managing the core functionality of routing and handling data exchanges between the client and server. It features well-structured routes for handling requests from the frontend and delivering responses.
* **Gemini AI** is integrated to perform searches related to space technology. This AI service processes user queries, fetches relevant space data, and forwards it to the frontend, where the information is displayed in real-time.
* The connection between the frontend and backend is established using **CORS** and **Axios** packages to ensure seamless communication, secure data transfer, and effective API calls.
* Comprehensive error handling is in place, covering both **synchronous** and **asynchronous** operations. The backend is designed to catch and respond to errors gracefully, ensuring a smooth user experience while maintaining the integrity of data exchanges between the client and server.