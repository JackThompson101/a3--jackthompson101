const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();
const port = process.env.PORT || 3000;
const dir = "public";


const mongoUrl = 'mongodb+srv://jackthompson1042:IKnowItsNotSecure123@cluster0.1luyg.mongodb.net/cs4241-a3';


app.use(express.json());
app.use(express.static(dir));
app.use(session({
    secret: "supersecuresecret",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: mongoUrl,
    }),
    cookie: {
      secure: false,
    }
  }));
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  _id: Number,
  "First Name": String,
  "Last Name": String,
  "Bodyweight": Number,
  "Email": String,
  "Username": String,
  "Password": String 
}, { collection: "users" });
const User = mongoose.model("User", userSchema);

const ExerciseSchema = new mongoose.Schema({
  userId: { type: String, ref: "User" },
  lift: String,         
  weight: Number,
  reps: Number,
  date: { type: Date, default: Date.now }
}, { collection: "exercise" });
const Lifts = mongoose.model("Lifts", ExerciseSchema);


function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).send("Unauthorized: Please log in.");
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, dir, "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, dir, "login.html"));
});

app.get("/home", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, dir, "home.html"));
});


// GET /getLifts – Retrieve all lifts for the logged-in user
app.get("/getLifts", isAuthenticated, async (req, res) => {
  console.log("===> /getLifts Route Hit");
  try {
    console.log("Fetching lifts for userId:", req.session.user.username);
    const lifts = await Lifts.find({ userId: req.session.user.username }).sort({ date: -1 });
    console.log("Lifts retrieved:", lifts);
    res.json(lifts);
  } catch (err) {
    console.error("Error retrieving lifts:", err);
    res.status(500).json({ message: "Error retrieving lifts" });
  }
});

// POST /submit – Add a new lift entry 
app.post("/submit", isAuthenticated, async (req, res) => {
  const { exercise, reps, weight } = req.body;
  if (!exercise || !reps || !weight) {
    return res.status(400).send("Error: Missing required fields (exercise, reps, weight)");
  }
  try {
    const newLift = new Lifts({
      userId: req.session.user.username,
      lift: exercise,                   
      reps: parseInt(reps, 10),
      weight: parseFloat(weight)
    });
    await newLift.save();
    res.json({ message: "Data added successfully", data: newLift });
  } catch (err) {
    console.error("Error saving data:", err);
    res.status(500).send("Error saving data");
  }
});

// DELETE /delete – Remove a lift entry
app.delete("/delete", isAuthenticated, async (req, res) => {
  const { exercise } = req.body;
  if (!exercise) {
    return res.status(400).send("Error: Missing required field (exercise)");
  }
  try {
    const result = await Lifts.findOneAndDelete({ lift: exercise, userId: req.session.user.username });
    if (result) {
      res.json({ message: "Data deleted successfully" });
    } else {
      res.status(404).send("Error: Data not found");
    }
  } catch (err) {
    console.error("Error deleting data:", err);
    res.status(500).send("Error deleting data");
  }
});

// PUT /update – Update a lift entry
app.put("/update", isAuthenticated, async (req, res) => {
  const { exercise, reps, weight } = req.body;
  if (!exercise || !reps || !weight) {
    return res.status(400).send("Error: Missing required fields (exercise, reps, weight)");
  }
  try {
    const updatedLift = await Lifts.findOneAndUpdate(
      { lift: exercise, userId: req.session.user.username },
      { reps: parseInt(reps, 10), weight: parseFloat(weight), date: Date.now() },
      { new: true }
    );
    if (updatedLift) {
      res.json({ message: "Data updated successfully", data: updatedLift });
    } else {
      res.status(404).send("Error: Data not found");
    }
  } catch (err) {
    console.error("Error updating data:", err);
    res.status(500).send("Error updating data");
  }
});



// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login Attempt:", username, password);
  if (!username || !password) {
    return res.status(400).json({ message: "Error: Missing username or password" });
  }
  try {
    const user = await User.findOne({ "Username": username });
    if (!user || password !== user.Password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    req.session.user = {
      id: user._id,
      username: user.Username,
      firstName: user["First Name"],
      lastName: user["Last Name"]
    };
    console.log("Login Successful for:", user.Username);
    res.json({ message: "Login successful", redirect: "/home" });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Error during login" });
  }
});

// User Logout
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.json({ message: "Logged out successfully" });
  });
});


app.get("/getUserData", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ Username: req.session.user.username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      firstName: user["First Name"],
      lastName: user["Last Name"],
      email: user.Email,
      bodyweight: user.Bodyweight,
      username: user.Username
    });
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).json({ message: "Error fetching user data" });
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
