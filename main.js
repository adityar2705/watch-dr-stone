//global variables
var fs = require("fs");
var express = require("express");
var bcrypt = require("bcrypt");
var mongoose = require("mongoose");
var multer = require("multer");
var nodemailer = require("nodemailer");
var bodyParser = require("body-parser");
var bcrypt = require("bcrypt");
var request = require("request");
var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
var expressValidator = require("express-validator");
var port = process.env.PORT || 3000;
var app = express();

//connecting to mongodb
process.env.MONGOOSE_CONNECT = "mongodb://admin:kaddu12manchurian@ds129146.mlab.com:29146/database1";
process.env.SECRET_KEY = "secret";
mongoose.connect(process.env.MONGOOSE_CONNECT);

//middleware
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static("uploads"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(expressValidator());
app.use(cookieParser());

//user schema
var userSchema = new mongoose.Schema({
	username:String,
	password:String
});

//mongoose model
var User = mongoose.model("User",userSchema);

//checkAuth
var checkAuth = function(req,res,next){
	if(req.cookies.aToken === null || typeof req.cookies.aToken === "undefined"){
		req.user = null;
	}
	else{
		var token = req.cookies.aToken;
		var decodedToken = jwt.decode(token,{complete:true});
		req.user = decodedToken.payload;
	}
	next();
};

//Implement checkAuth
app.use(checkAuth);

//GET route for signup
app.get("/signup",function(req,res){
	res.render("signup");
});

//POST route for / post
app.post("/signup",function(req,res){
	req.check("password","Password must be atleast 4 characters long. It must equal the confirm password ! <a href = '/signup' style = 'color:green;text-decoration:none;'>Go Back</a> ").isLength({min:4}).equals(req.body.confirmPassword);
	req.check("username","Username can't be empty ! <a href = '/signup' style = 'color:green;text-decoration:none;'>Go Back</a> ").not().isEmpty();
	var errors = req.validationErrors();
	if(errors){
		var err = "";
		errors.forEach(function(error){
			err +=  error.msg + "<BR>";
		});
		res.send(err);
	}
	else{
		User.findOne({username:req.body.username},function(err,user){
			if(user){
				res.send("User already exists! Is it you ? <a href = '/signin' style = 'color:green;text-decoration:none;'>Sign In</a>");
			}
			else{
				var hash = bcrypt.hashSync(req.body.password,10);
				var newUser = new User({
					username:req.body.username,
					password:hash
				});
				newUser.save(function(err,user){
					var token  = jwt.sign({_id:user._id},process.env.SECRET_KEY,{expiresIn:"60 days"});
					res.cookie("aToken",token,{maxAge:900000,httpOnly:true});
					res.redirect("/");
				});	
			}
		});
	}
});

//GET route for /signin
app.get("/signin",function(req,res){
	res.render("signin");
});

//POST route for /signin
app.post("/signin",function(req,res){
	User.findOne({username:req.body.username},function(err,user){
		if(user){
			var verify = bcrypt.compareSync(req.body.password,user.password);
			if(verify){
				var token  = jwt.sign({_id:user._id},process.env.SECRET_KEY,{expiresIn:"60 days"});
				res.cookie("aToken",token,{maxAge:900000,httpOnly:true});
				res.redirect("/");
			}
			else{
				res.send("Wrong password or user doesn't exist! <a href = '/signin' style = 'color:green;text-decoration:none;'>Go Back</a> ");
			}
		}
		else{
			res.send("Wrong password or user doesn't exist! <a href = '/signin' style = 'color:green;text-decoration:none;'>Go Back</a>  ");
		}
	});
});

//GET route for /main
app.get("/",function(req,res){
	Episode.find({},function(err,episodes){
		request.get("https://api.jikan.moe/v3/anime/38691/stats/",function(error,response,body){
			if(req.user === null){
				res.render("main",{loggedIn:false,episodes:episodes,body:JSON.parse(body)});
			}
			else{
				User.findOne({_id:req.user},function(err,user){
					res.render("main",{user:user,loggedIn:true,episodes:episodes,body:JSON.parse(body)});
				});
			}		
		});
	});
});

//GET route for /logout
app.get("/logout",function(req,res){
	res.clearCookie("aToken");
	res.redirect('/');
});

//episode schema
var episodeSchema = new mongoose.Schema({
	number:String,
	link:String,
	name:String,
	downloadLink:String
});

//episode model
var Episode = mongoose.model("Episode",episodeSchema);

//GET route for /add
app.get("/add",function(req,res){
	res.render("add");
});

//POST route for /add
app.post("/add",function(req,res){
	var newEpisode = new Episode({
		number:req.body.number,
		link:req.body.link,
		name:req.body.name,
		downloadLink:req.body.downloadLink
	});
	newEpisode.save(function(err,episode){
		res.send("Episode Added!");
	});
});

//GET route for view page
app.get("/watch/episode/:number",function(req,res){
	Episode.findOne({number:req.params.number},function(err,episode){
		if(req.user === null){
			res.render("view",{loggedIn:false,episode:episode});
		}
		else{
			res.render("view",{loggedIn:true,episode:episode});
		}	
	});
});


//start app on port 3000, with a display message
app.listen(port,function(){
	console.log("Server started on port 3000..");
});
