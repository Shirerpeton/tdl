'use strict';

const moment = require('moment');

const bcrypt = require('bcryptjs');
const saltRounds = 8;

const yup = require('yup');

const koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
const cors = require('@koa/cors');

const signupSchema = yup.object().shape({
	login: yup.string().required('Login must not be empty'),
	password: yup.string().min(4, 'Passowrd must be at least 4 characters long').max(50, 'Password must be not more than 50 characters long').required('Password must not be empty'),
});

let loginSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password')
});

const app = new koa();

app.keys = ['yetanothersecret'];

app.use(session(app));
app.use(bodyParser());
app.use(cors());

const router = Router();

router.post('/login', async (ctx, next) => {
	try {
		console.log('login request');
		if (ctx.session.login === ctx.request.body.login) {
			ctx.body = {status: 'ok', login: ctx.session.login};
			return;
		}
		if (ctx.session.login != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are already logged in as ' + ctx.session.login, login: ctx.session.login};
			return;
		}
		try {
			await loginSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.request.body.login;
		//const result = await userModel.findOne({login: login}).exec();
		
		if (result === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Wrong login'};
			return;
		}
		try {
			var comparison = await bcrypt.compare(ctx.request.body.password, result.password);
		} catch(err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error', msg: 'Internal server error'};
			return;
		}
		if (!comparison) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Wrong password'};
			return;
		}
		ctx.session.login = login;
		ctx.body = {status: 'ok', login: login};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/signup', async (ctx, next) => {
	try {
		console.log('signup request');
		if (ctx.session.login != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are already logged in', login: ctx.session.login};
			return;
		}
		try {
			await signupSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.request.body.login;
		const result = await userModel.findOne({login: login}).exec();
		if (result != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'User with such login already exists'};
			return;
		} else {
			try {
				var hash = await bcrypt.hash(ctx.request.body.password, saltRounds);
			} catch(err) {
				ctx.response.status = 500;
				ctx.body = {status: 'error', msg: 'Internal server error'};
				return;
			}
			await new userModel({login: login, password: hash}).save();
		}
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/logout', async (ctx) => {
	try {
		console.log('logout request');
		if (ctx.session.login === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		ctx.session.login = null;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

app.use(router.routes());

app.listen(3001);