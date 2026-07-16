const express = require("express");
const fs = require("fs");

const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;

const config = require("./config");

const app = express();

const PORT = process.env.PORT || 3000;


// ==========================
// Middleware
// ==========================

app.use(express.json());

app.use(express.urlencoded({

    extended:true

}));

app.set("trust proxy", 1);

app.use(session({
    secret: process.env.SESSION_SECRET || "legacy-zone-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: "lax"
    }
}));


app.use(passport.initialize());

app.use(passport.session());


// ==========================
// Passport
// ==========================

passport.serializeUser((user,done)=>{

    done(null,user);

});


passport.deserializeUser((user,done)=>{

    done(null,user);

});


passport.use(new DiscordStrategy({

    clientID:config.discordClientID,

    clientSecret:config.discordClientSecret,

    callbackURL:config.callbackURL,

    scope:["identify"]

},

(accessToken,refreshToken,profile,done)=>{

    return done(null,profile);

}));


app.use(express.static(__dirname));

app.get("/test-admin", (req,res)=>{

    res.sendFile(__dirname + "/admin.html");

});

// ==========================
// Database
// ==========================

const database="./database.json";


function getData(){

    return JSON.parse(

        fs.readFileSync(database,"utf8")

    );

}


function saveData(data){

    fs.writeFileSync(

        database,

        JSON.stringify(data,null,2)

    );

}


// ==========================
// Admin Check
// ==========================

function isAdmin(req){

    if(!req.user){

        return false;

    }

    return config.admins.includes(req.user.id);

}

// ==========================
// Discord Login
// ==========================

app.get("/auth/discord",

    passport.authenticate("discord")

);


app.get("/auth/discord/callback",
    (req, res, next) => {

        console.log("1 - CALLBACK START");

        next();

    },

    passport.authenticate("discord", {

        failureRedirect: "/login.html"

    }),

    (req, res) => {

        console.log("2 - LOGIN OK");

        console.log(req.user);

        res.send("DISCORD OK");

    }
);


// ==========================
// Logout
// ==========================

app.get("/logout", (req, res) => {

    req.logout((err) => {

        if (err) {

            return res.status(500).send("Logout Error");

        }

        req.session.destroy(() => {

            res.redirect("/login.html");

        });

    });

});


// ==========================
// Check Admin
// ==========================

app.get("/api/check-admin", (req, res) => {

    if (!req.user) {

        return res.json({

            admin: false

        });

    }

    res.json({

        admin: config.admins.includes(req.user.id),

        id: req.user.id,

        username: req.user.username,

        avatar: req.user.avatar

    });

});


// ==========================
// Admin Page
// ==========================

app.get("/auth/discord/callback",
    passport.authenticate("discord", {
        failureRedirect: "/login.html"
    }),
    (req, res) => {

        res.redirect("/admin.html");

    }
);
// ==========================
// Events
// ==========================

app.post("/api/events", (req, res) => {

    if (!isAdmin(req)) {
        return res.status(403).json({
            success: false
        });
    }

    const data = getData();

    const event = {
        id: Date.now(),
        title: req.body.title,
        date: req.body.date,
        time: req.body.time,
        location: req.body.location,
        prize: req.body.prize,
        description: req.body.description
    };

    data.events.push(event);

    saveData(data);

    res.json({
        success: true
    });

});


app.get("/api/events", (req, res) => {

    const data = getData();

    res.json(data.events);

});


app.delete("/api/events/:id", (req, res) => {

    if (!isAdmin(req)) {
        return res.status(403).json({
            success: false
        });
    }

    const data = getData();

    data.events = data.events.filter(
        event => event.id !== Number(req.params.id)
    );

    saveData(data);

    res.json({
        success: true
    });

});


// ==========================
// Updates
// ==========================

app.post("/api/updates", (req, res) => {

    if (!isAdmin(req)) {
        return res.status(403).json({
            success: false
        });
    }

    const data = getData();

    data.updates.push({

        id: Date.now(),

        title: req.body.title,

        message: req.body.message,

        date: new Date().toLocaleDateString("he-IL")

    });

    saveData(data);

    res.json({
        success: true
    });

});


app.get("/api/updates", (req, res) => {

    const data = getData();

    res.json(data.updates);

});


app.delete("/api/updates/:id", (req, res) => {

    if (!isAdmin(req)) {
        return res.status(403).json({
            success: false
        });
    }

    const data = getData();

    data.updates = data.updates.filter(
        update => update.id !== Number(req.params.id)
    );

    saveData(data);

    res.json({
        success: true
    });

});


// ==========================
// Start Server
// ==========================

app.listen(PORT, () => {

    console.log(`🚀 Server running on port ${PORT}`);

});