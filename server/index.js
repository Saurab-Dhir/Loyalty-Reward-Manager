//Importing the necessary packages
const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const authRoutes = require("./routes/authRoutes");

//Creating an instance of express
const app = express();

app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:4200",
  })
);
app.use(express.json());

//Getting the routes from the routes file
app.use("/api", authRoutes);

//Listening on port 3000
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
