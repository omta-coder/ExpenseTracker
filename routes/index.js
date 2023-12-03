var express = require("express");
var router = express.Router();
const User = require("../models/userModel");
const Expense = require("../models/expenseModel");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const nodemailer = require("nodemailer");

passport.use(new LocalStrategy(User.authenticate()));


router.get("/", function (req, res, next) {
    res.render("index", { admin: req.user });
});

router.get("/signup", function (req, res, next) {
    res.render("signup", { admin: req.user });
});

router.post("/signup", async function (req, res, next) {
    try {
        await User.register(
            { username: req.body.username, email: req.body.email },
            req.body.password
        );
        res.redirect("/signin");
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

router.get("/signin", function (req, res, next) {
    res.render("signin", { admin: req.user });
});

router.post(
    "/signin",
    passport.authenticate("local", {
        successRedirect: "/profile",
        failureRedirect: "/signin",
    }),
    function (req, res, next) {}
);

router.get("/signout", isLoggedIn, function (req, res, next) {
    req.logout(() => {
        res.redirect("/signin");
    });
});

router.get("/profile", isLoggedIn,async function (req, res, next) {
   try {
    const user = await req.user.populate("expenses")

     res.render("profile", { admin: req.user, expenses:user.expenses});
   } catch (error) {
    res.send(error);
   }
});


router.get("/delete/:id", isLoggedIn, async function (req, res, next) {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});

router.get("/update/:id", isLoggedIn, async function (req, res, next) {
    try {
        const user = await Expense.findById(req.params.id);
        res.render("update", { user: user, admin: req.user });
    } catch (error) {
        res.send(error);
    }
});

router.post("/update/:id", isLoggedIn, async function (req, res, next) {
    try {
        await Expense.findByIdAndUpdate(req.params.id, req.body);
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});

router.post("/search", isLoggedIn, async function (req, res, next) {
    try {
        const user = await User.findOne({ username: req.body.username });
        res.json(user);
    } catch (error) {
        res.send(error);
    }
});


router.get("/forget", function (req, res, next) {
    res.render("forget", { admin: req.user });
});

router.post('/send-mail',async function(req, res, next) {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.send("User not found");

        sendmailhandler(req, res, user);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
  });

  function sendmailhandler(req, res, user) {
    const otp = Math.floor(1000 + Math.random() * 9000);
    const transport = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        auth: {
            user: "omtadayma2001@gmail.com",
            pass: "btoveysbptfsyyfr",
        },
    });
  
    const mailOptions = {
        from: "Omta Pvt. Ltd.<omtadayma@gmail.com>",
        to: user.email,
        subject: "Password Reset Link",
        // text: "Do not share this link to anyone.",
        html: `<h1>${otp}</h1>`,
    };
  
    transport.sendMail(mailOptions,(err, info) => {
        if (err) return res.send(err);
        console.log(info);
        user.resetPasswordOtp = otp;
        user.save();
        res.render("otp", { admin: req.user, email: user.email });
    });
  }
  
router.post("/match-otp/:email", async function (req, res, next) {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (user.resetPasswordOtp == req.body.otp) {
            user.resetPasswordOtp = -1;
            await user.save();
            res.render("resetpassword", { admin: req.user, id: user._id });
        } else {
            res.send(
                "Invalid OTP, Try Again <a href='/forget'>Forget Password</a>"
            );
        }
    } catch (error) {
        res.send(error);
    }
});


router.post("/resetpassword/:id", async function (req, res, next) {
    try {
        const user = await User.findById(req.params.id);
        await user.setPassword(req.body.password);
        res.redirect("/signin");
    } catch (error) {
        res.send(error);
    }
});

router.get("/reset", isLoggedIn, function (req, res, next) {
    res.render("reset", { admin: req.user });
});

router.post("/reset", isLoggedIn, async function (req, res, next) {
    try {
        await req.user.changePassword(
            req.body.oldpassword,
            req.body.newpassword
        );
        await req.user.save();
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect("/signin");
    }
}

router.get("/createexpense", isLoggedIn, function (req, res, next) {
    res.render("createexpense", { admin: req.user });
  });
  
  router.post("/createexpense", isLoggedIn, async function (req, res, next) {
    try {
        const expense = await new Expense(req.body);
        req.user.expenses.push(expense._id);
        expense.user = req.user._id;
        await expense.save();
        await req.user.save();
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
  });

  router.get("/filter", isLoggedIn,async function (req, res, next) {
    try {
        const data = await Expense.find()
        console.log("data",data);

        let fildata = data.filter((d)=>{
            return d.value ===req.body.value
        })
        res.json(fildata);
    } catch (error) {
        res.send(error);
    }
  });

  



module.exports = router;
