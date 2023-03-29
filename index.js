require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const redis = require("redis");
const connectRedis = require("connect-redis");
const bcrypt = require("bcryptjs");
const User = require("./models/user.model");

const app = express();

const RedisStore = connectRedis(session);
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on("error", function (err) {
  console.log("Could not establish a connection with redis. " + err);
});
redisClient.on("connect", function (err) {
  console.log("Connected to redis successfully");
});

// Connect to MongoDB

(async function() {
    try {
      let mongoURI = "mongodb://mongo:27017/xyborg";
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is listening on port ${process.env.PORT || 3000}`);
    });
  } catch (err) {
    console.error(err);
  }
})();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);


// Configure session : This will make sure that the session is stored in Redis and not in memory (which is the default)
app.use(
  session({
    store: new RedisStore({ client: redisClient}),
    secret: "secret$%^134",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // if true only transmit cookie over https
      httpOnly: false, // if true prevent client side JS from reading the cookie
      maxAge: 1000 * 60 * 10, // session max age in miliseconds
    },
  })
);


// Routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// sign up
app.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).send("User already exists");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword });
        req.session.userId = user._id;
        return res.status(201).json({ message: "User created" });
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});

// sign in
// User Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await User.findOne({ email });
      
      console.log("=============user=================")
      console.log(user);
        console.log("=============user=================")

    if (!user) {
      return res.status(404).send("User not found");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send("Incorrect password");
    }

      req.session.userId = user._id;
      console.log("=============session=================")
      console.log(req.session.userId);
      console.log("=============session=================")
    return res.status(200).json({ message: "User logged in" });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

// Authentication middleware
const withAuth = (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).send("Unauthorized: No session found");
  } else {
    next();
  }
};

// Protected route
// User profile endpoint
app.get("/profile", withAuth, async (req, res) => {
  const userId = req.session.userId;

  // Try to retrieve the user's profile data from the Redis cache
  redisClient.get(`user:${userId}`, async (error, cachedData) => {
    if (error) {
      console.error(error);
    }

    if (cachedData) {
      // If the data is found in the cache, return it
      res.send(JSON.parse(cachedData));
    } else {
      // If the data is not found in the cache, retrieve it from the database
      try {
        const user = await User.findById(userId);

        if (!user) {
          return res.status(404).send("User not found");
        }

        const profileData = {
          email: user.email,
            

        };

        // Save the profile data to the Redis cache with a TTL of 5 minutes
        redisClient.setex(
          `user:${userId}`,
          300,
          JSON.stringify(profileData)
        );

        res.send(profileData);
      } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
      }
    }
  });
});

// app.listen(3000, () => {
//   console.log("Server listening on port 3000");
// });
