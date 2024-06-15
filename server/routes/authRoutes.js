const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
require("dotenv").config();

const router = express.Router();

mongodb_uri = process.env.MONGODB_URI;
token_secret = process.env.TOKEN_SECRET;

// Check if the environment variables are provided
if (!mongodb_uri || !token_secret) {
  throw new Error(
    "MONGODB_URI and TOKEN_SECRET must be provided in the .env file"
  );
}

// Connect to the mongodb database
const client = new MongoClient(mongodb_uri);
client.connect().catch((err) => {
  console.error(err);
  return;
});

router.post("/login", async (req, res) => {
  try {
    const password = req.body.password;
    const email = req.body.email;

    // Check mongodb for the user with the email
    const usersCollection = client
      .db("LoyaltyRewardProgram")
      .collection("users");

    const user = await usersCollection.findOne({ email: email });
    // Check if the user exists
    if (!user) throw new Error("User not found");

    // Check if the password is correct with bcrypt
    if (!(await bcrypt.compare(password, user.password)))
      throw new Error("Invalid password");

    // Create a token with jwt
    const token = jwt.sign(
      {
        _id: user._id,
      },
      token_secret
    );

    // Set the token in the cookie
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.send({ message: "Logged in" });
  } catch (err) {
    console.error(err);
    res.status(400).send(err instanceof Error ? err.message : "Unknown error");
  }
});

router.post("/register", async (req, res) => {
  try {
    const password = req.body.password;
    const email = req.body.email;
    const name = req.body.name;

    // Hash the password with the bcrypt package
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user object
    const user = {
      name: name,
      email: email,
      password: hashedPassword,
    };

    // Connect it to mongodb
    const usersCollection = client
      .db("LoyaltyRewardProgram")
      .collection("users");

    // Check if the user already exists
    const existingUser = await usersCollection.findOne({
      email: email,
      name: name,
    });

    if (existingUser) throw new Error("User already exists");

    // Insert the user into the database
    const result = await usersCollection.insertOne(user);

    // Check if the user was inserted
    if (result.acknowledged) {
      const { password, ...data } = result;
      return res.status(201).send(data);
    } else throw new Error("User not created");
  } catch (err) {
    console.error(err);
    res.status(400).send(err instanceof Error ? err.message : "Unknown error");
  }
});

router.post("/logout", (req, res) => {
  // Clear the cookie
  res.cookie("jwt", "", { maxAge: 0 });
  res.send({ message: "Logged out" });
});

router.get("/user", async (req, res) => {
  try {
    // Get the token from the cookie
    const cookie = req.cookies["jwt"];
    if (!cookie) throw new Error("No token provided");

    // Verify the token with jwt
    const claims = jwt.verify(cookie, token_secret);

    if (!claims) throw new Error("No claims found in token");

    const usersCollection = client
      .db("LoyaltyRewardProgram")
      .collection("users");

    // Find the user with the id from the token
    const user = await usersCollection.findOne({
      _id: new ObjectId(claims._id),
    });
    if (!user) throw new Error("User not found");

    const { password, ...data } = user;
    return res.send(data);
  } catch (err) {
    return res
      .status(401)
      .send(err instanceof Error ? err.message : "Unknown error");
  }
});
module.exports = router;
